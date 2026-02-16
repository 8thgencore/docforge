from __future__ import annotations

import asyncio
import inspect
import uuid
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.db.session import get_session
from src.models.entities import (
    Document,
    DocumentGroup,
    DocumentStatus,
    DocumentTag,
    IngestionJob,
    IngestionStatus,
    SourceType,
)
from src.schemas.ingestion import IngestionCreatedResponse, IngestionStatusResponse
from src.services.storage import extract_zip, save_upload
from src.tasks.ingest_tasks import ingest_documents_task
from src.utils.hashing import sha256_file

router = APIRouter(tags=["ingestions"])
settings = get_settings()


async def _ensure_group(session: AsyncSession, group_id: UUID) -> DocumentGroup:
    group = await session.get(DocumentGroup, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="group not found")
    return group


async def _dispatch_ingestion(job: IngestionJob, document_ids: list[str]) -> str | None:
    maybe_task = ingest_documents_task.kiq(job_id=str(job.id), document_ids=document_ids)
    task = await maybe_task if inspect.isawaitable(maybe_task) else maybe_task
    return getattr(task, "task_id", None)


async def _ensure_tag(session: AsyncSession, raw_tag: str | None) -> str | None:
    if raw_tag is None:
        return None
    normalized_tag = raw_tag.strip()
    if not normalized_tag:
        return None
    existing = await session.scalar(select(DocumentTag).where(DocumentTag.name == normalized_tag))
    if existing is None:
        session.add(DocumentTag(name=normalized_tag))
        await session.flush()
    return normalized_tag


@router.post("/groups/{group_id}/ingestions/upload", response_model=IngestionCreatedResponse)
async def upload_documents(
    group_id: UUID,
    files: list[UploadFile] = File(...),
    tag: str | None = Form(default=None),
    category: str | None = Form(default=None),
    session: AsyncSession = Depends(get_session),
) -> IngestionCreatedResponse:
    await _ensure_group(session, group_id)
    selected_tag = await _ensure_tag(session=session, raw_tag=tag or category)
    base_upload_dir = settings.upload_path / str(group_id)
    base_upload_dir.mkdir(parents=True, exist_ok=True)

    job = IngestionJob(group_id=group_id, status=IngestionStatus.queued, stage="queued", progress=0.0)
    session.add(job)
    await session.flush()

    document_ids: list[str] = []
    duplicates = 0

    for upload in files:
        original_name = upload.filename or "upload.bin"
        target = base_upload_dir / f"{uuid.uuid4()}-{Path(original_name).name}"
        await save_upload(upload, target)
        checksum = await asyncio.to_thread(sha256_file, target)

        duplicate = await session.scalar(
            select(Document).where(Document.group_id == group_id, Document.checksum == checksum).limit(1),
        )
        if duplicate:
            duplicates += 1
            target.unlink(missing_ok=True)
            continue

        document = Document(
            group_id=group_id,
            tag=selected_tag,
            source_type=SourceType.upload,
            source_uri=str(target),
            filename=original_name,
            checksum=checksum,
            mime_type=upload.content_type,
            status=DocumentStatus.uploaded,
        )
        session.add(document)
        await session.flush()
        document_ids.append(str(document.id))

    if document_ids:
        task_id = await _dispatch_ingestion(job=job, document_ids=document_ids)
        job.task_id = task_id
    else:
        job.status = IngestionStatus.completed
        job.stage = "completed"
        job.progress = 1.0
        job.stats = {"ingested_documents": 0, "duplicates": duplicates}

    await session.commit()
    return IngestionCreatedResponse(ingestion_id=job.id, task_id=job.task_id, status=job.status)


@router.post("/groups/{group_id}/ingestions/zip", response_model=IngestionCreatedResponse)
async def upload_zip(
    group_id: UUID,
    archive: UploadFile = File(...),
    tag: str | None = Form(default=None),
    category: str | None = Form(default=None),
    session: AsyncSession = Depends(get_session),
) -> IngestionCreatedResponse:
    await _ensure_group(session, group_id)
    selected_tag = await _ensure_tag(session=session, raw_tag=tag or category)
    base_upload_dir = settings.upload_path / str(group_id)
    base_upload_dir.mkdir(parents=True, exist_ok=True)

    archive_path = base_upload_dir / f"{uuid.uuid4()}-{Path(archive.filename or 'archive.zip').name}"
    await save_upload(archive, archive_path)

    extracted_dir = settings.storage_path / str(group_id) / f"zip-{uuid.uuid4()}"
    extracted_files = extract_zip(archive_path=archive_path, destination_dir=extracted_dir)

    job = IngestionJob(group_id=group_id, status=IngestionStatus.queued, stage="queued", progress=0.0)
    session.add(job)
    await session.flush()

    document_ids: list[str] = []
    duplicates = 0

    for extracted in extracted_files:
        checksum = await asyncio.to_thread(sha256_file, extracted)
        duplicate = await session.scalar(
            select(Document).where(Document.group_id == group_id, Document.checksum == checksum).limit(1),
        )
        if duplicate:
            duplicates += 1
            continue

        document = Document(
            group_id=group_id,
            tag=selected_tag,
            source_type=SourceType.zip_upload,
            source_uri=str(extracted),
            filename=extracted.name,
            checksum=checksum,
            mime_type=None,
            status=DocumentStatus.uploaded,
        )
        session.add(document)
        await session.flush()
        document_ids.append(str(document.id))

    if document_ids:
        task_id = await _dispatch_ingestion(job=job, document_ids=document_ids)
        job.task_id = task_id
    else:
        job.status = IngestionStatus.completed
        job.stage = "completed"
        job.progress = 1.0
        job.stats = {"ingested_documents": 0, "duplicates": duplicates}

    await session.commit()
    return IngestionCreatedResponse(ingestion_id=job.id, task_id=job.task_id, status=job.status)


@router.get("/ingestions/{ingestion_id}", response_model=IngestionStatusResponse)
async def get_ingestion_status(
    ingestion_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> IngestionStatusResponse:
    job = await session.get(IngestionJob, ingestion_id)
    if job is None:
        raise HTTPException(status_code=404, detail="ingestion not found")
    return IngestionStatusResponse.model_validate(job)


@router.get("/ingestions", response_model=list[IngestionStatusResponse])
async def list_ingestions(
    group_id: UUID | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
) -> list[IngestionStatusResponse]:
    query = select(IngestionJob).order_by(IngestionJob.created_at.desc()).limit(limit)
    if group_id is not None:
        query = query.where(IngestionJob.group_id == group_id)
    jobs = (await session.scalars(query)).all()
    return [IngestionStatusResponse.model_validate(job) for job in jobs]


@router.post("/ingestions/{ingestion_id}/pause", response_model=IngestionStatusResponse)
async def pause_ingestion(
    ingestion_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> IngestionStatusResponse:
    job = await session.get(IngestionJob, ingestion_id)
    if job is None:
        raise HTTPException(status_code=404, detail="ingestion not found")

    active_statuses = {IngestionStatus.queued, IngestionStatus.running, IngestionStatus.retrying}
    if job.status not in active_statuses:
        raise HTTPException(status_code=409, detail="ingestion is not active")

    job.status = IngestionStatus.paused
    job.stage = "paused"
    await session.commit()
    await session.refresh(job)
    return IngestionStatusResponse.model_validate(job)
