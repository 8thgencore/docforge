from __future__ import annotations

import asyncio
import logging
import uuid
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from src.application.ports.llm import TextEmbedder
from src.bootstrap.container import get_qdrant_service, get_text_embedder
from src.core.config import get_settings
from src.infrastructure.document_io.parser import parse_document
from src.infrastructure.persistence.db.session import AsyncSessionLocal
from src.infrastructure.persistence.models.entities import (
    Document,
    DocumentChunk,
    DocumentStatus,
    IngestionJob,
    IngestionStage,
    IngestionStatus,
)
from src.tasks.broker import broker
from src.utils.chunking import iter_chunks

logger = logging.getLogger(__name__)
settings = get_settings()

EMBED_BATCH_SIZE = 32


@broker.task(task_name="ingest_documents")
async def ingest_documents_task(job_id: str, document_ids: list[str]) -> dict:
    async with AsyncSessionLocal() as session:
        job = await session.get(IngestionJob, uuid.UUID(job_id))
        if job is None:
            logger.error("ingestion job %s not found", job_id)
            return {"ok": False, "reason": "job_not_found"}

        if job.status != IngestionStatus.paused:
            job.status = IngestionStatus.running
            job.stage = IngestionStage.parsing
            job.progress = 0.05
            job.error = None
            await session.commit()

        return await _run_ingestion(session=session, job=job, document_ids=document_ids)


def _build_chunk_payload(document: Document, point_id: str, chunk_text: str) -> dict:
    return {
        "group_id": str(document.group_id),
        "document_id": str(document.id),
        "chunk_id": point_id,
        "filename": document.filename,
        "tag": document.tag,
        "text": chunk_text,
    }


async def _embed_chunks(embedder: TextEmbedder, chunks: list[str]) -> list[list[float]]:
    vectors: list[list[float]] = []
    for start in range(0, len(chunks), EMBED_BATCH_SIZE):
        batch = chunks[start : start + EMBED_BATCH_SIZE]
        vectors.extend(await embedder.embed_texts(batch))
    return vectors


async def _index_document_chunks(
    *,
    session: AsyncSession,
    document: Document,
    vectors: list[list[float]],
    parsed_metadata: dict | None,
    chunks: list[str],
) -> None:
    qdrant = get_qdrant_service()
    point_ids: list[str] = []
    payloads: list[dict] = []

    for chunk_index, chunk_text in enumerate(chunks):
        chunk_id = uuid.uuid4()
        point_id = str(chunk_id)
        session.add(
            DocumentChunk(
                id=chunk_id,
                document_id=document.id,
                chunk_index=chunk_index,
                text=chunk_text,
                token_count=len(chunk_text.split()),
                meta=parsed_metadata,
                qdrant_point_id=point_id,
            ),
        )
        point_ids.append(point_id)
        payloads.append(_build_chunk_payload(document=document, point_id=point_id, chunk_text=chunk_text))

    await session.flush()
    await qdrant.upsert_chunks(point_ids=point_ids, vectors=vectors, payloads=payloads)


async def _process_document(session: AsyncSession, document: Document, embedder: TextEmbedder) -> bool:
    parsed = await asyncio.to_thread(parse_document, Path(document.source_uri))
    chunks = [chunk for _, chunk in iter_chunks(parsed.text, settings.max_chunk_chars, settings.chunk_overlap)]
    if not chunks:
        document.status = DocumentStatus.failed
        await session.commit()
        return False

    vectors = await _embed_chunks(
        embedder=embedder,
        chunks=chunks,
    )

    await _index_document_chunks(
        session=session,
        document=document,
        vectors=vectors,
        parsed_metadata=parsed.metadata,
        chunks=chunks,
    )

    document.language = parsed.language
    document.status = DocumentStatus.indexed
    await session.commit()
    return True


async def _run_ingestion(session: AsyncSession, job: IngestionJob, document_ids: list[str]) -> dict:
    embedder = get_text_embedder()
    ingested = 0
    total_documents = len(document_ids)

    try:
        for index, raw_document_id in enumerate(document_ids):
            await session.refresh(job)
            if job.status == IngestionStatus.paused:
                job.stage = IngestionStage.paused
                await session.commit()
                return {"ok": True, "paused": True, "ingested_documents": ingested}

            document = await session.get(Document, uuid.UUID(raw_document_id))
            if document is None:
                continue

            if await _process_document(session=session, document=document, embedder=embedder):
                ingested += 1

            job.stage = IngestionStage.indexing
            job.progress = min(0.95, (index + 1) / max(1, total_documents))
            job.error = None
            await session.commit()

        await session.refresh(job)
        if job.status == IngestionStatus.paused:
            job.stage = IngestionStage.paused
            await session.commit()
            return {"ok": True, "paused": True, "ingested_documents": ingested}

        job.status = IngestionStatus.completed
        job.stage = IngestionStage.completed
        job.progress = 1.0
        job.stats = {"ingested_documents": ingested, "total_documents": total_documents}
        job.error = None
        await session.commit()
        return {"ok": True, "ingested_documents": ingested}
    except Exception as exc:
        logger.exception("ingestion failed for job %s", str(job.id))
        job.status = IngestionStatus.failed
        job.stage = IngestionStage.failed
        job.error = str(exc)
        await session.commit()
        raise
