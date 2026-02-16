from __future__ import annotations

import asyncio
import logging
import uuid
from collections.abc import Awaitable, Callable
from pathlib import Path

import httpx
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
    IngestionStatus,
)
from src.tasks.broker import broker
from src.utils.chunking import iter_chunks

logger = logging.getLogger(__name__)
settings = get_settings()

EMBED_BATCH_SIZE = 32
EMBED_RATE_LIMIT_MAX_ATTEMPTS = 8


async def _pause_job(session: AsyncSession, job: IngestionJob, ingested: int) -> dict:
    job.stage = "paused"
    await session.commit()
    return {"ok": True, "paused": True, "ingested_documents": ingested}


def _build_chunk_payload(document: Document, point_id: str, chunk_text: str) -> dict:
    return {
        "group_id": str(document.group_id),
        "document_id": str(document.id),
        "chunk_id": point_id,
        "filename": document.filename,
        "tag": document.tag,
        "text": chunk_text,
    }


def with_failed_job_state[**P](func: Callable[P, Awaitable[dict]]) -> Callable[P, Awaitable[dict]]:
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> dict:
        session = kwargs["session"]
        job = kwargs["job"]
        assert isinstance(session, AsyncSession)
        assert isinstance(job, IngestionJob)

        try:
            return await func(*args, **kwargs)
        except Exception as exc:
            logger.exception("ingestion failed for job %s", str(job.id))
            job.status = IngestionStatus.failed
            job.stage = "failed"
            job.error = str(exc)
            await session.commit()
            raise

    return wrapper


def with_embedding_rate_limit_retries[**P](
    func: Callable[P, Awaitable[list[list[float]]]],
) -> Callable[P, Awaitable[list[list[float]]]]:
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> list[list[float]]:
        session = kwargs["session"]
        job = kwargs["job"]
        assert isinstance(session, AsyncSession)
        assert isinstance(job, IngestionJob)

        for attempt in range(1, EMBED_RATE_LIMIT_MAX_ATTEMPTS + 1):
            try:
                return await func(*args, **kwargs)
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code != 429 or attempt >= EMBED_RATE_LIMIT_MAX_ATTEMPTS:
                    raise

                delay = _retry_delay_seconds(attempt=attempt, retry_after=exc.response.headers.get("retry-after"))
                job.status = IngestionStatus.retrying
                job.stage = "embedding_rate_limited"
                job.error = f"Embedding provider rate limited (429), retrying in {delay:.1f}s"
                await session.commit()

                logger.warning(
                    "embedding rate limited for ingestion %s (attempt=%s), retrying in %.1fs",
                    job.id,
                    attempt,
                    delay,
                )
                await asyncio.sleep(delay)

        raise RuntimeError("embedding retry loop exhausted")

    return wrapper


@broker.task(task_name="ingest_documents")
async def ingest_documents_task(job_id: str, document_ids: list[str]) -> dict:
    async with AsyncSessionLocal() as session:
        job_uuid = uuid.UUID(job_id)
        job = await session.get(IngestionJob, job_uuid)
        if job is None:
            logger.error("ingestion job %s not found", job_id)
            return {"ok": False, "reason": "job_not_found"}

        if job.status != IngestionStatus.paused:
            job.status = IngestionStatus.running
            job.stage = "parsing"
            job.progress = 0.05
            job.error = None
            await session.commit()

        return await _run_ingestion(session=session, job=job, document_ids=document_ids)


@with_failed_job_state
async def _run_ingestion(*, session: AsyncSession, job: IngestionJob, document_ids: list[str]) -> dict:
    embedder = get_text_embedder()
    qdrant = get_qdrant_service()
    ingested = 0

    for index, raw_document_id in enumerate(document_ids):
        await session.refresh(job)
        if job.status == IngestionStatus.paused:
            return await _pause_job(session=session, job=job, ingested=ingested)

        document = await session.get(Document, uuid.UUID(raw_document_id))
        if document is None:
            continue

        parsed = await asyncio.to_thread(parse_document, Path(document.source_uri))
        chunks = [chunk for _, chunk in iter_chunks(parsed.text, settings.max_chunk_chars, settings.chunk_overlap)]
        if not chunks:
            document.status = DocumentStatus.failed
            continue

        vectors = await _embed_with_rate_limit_retries(
            embedder=embedder,
            chunks=chunks,
            session=session,
            job=job,
        )
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
                meta=parsed.metadata,
                qdrant_point_id=point_id,
                ),
            )

            point_ids.append(point_id)
            payloads.append(_build_chunk_payload(document=document, point_id=point_id, chunk_text=chunk_text))

        await session.flush()
        await qdrant.upsert_chunks(point_ids=point_ids, vectors=vectors, payloads=payloads)

        document.language = parsed.language
        document.status = DocumentStatus.indexed
        ingested += 1

        job.progress = min(0.95, (index + 1) / max(1, len(document_ids)))
        job.stage = "indexing"
        await session.commit()

    await session.refresh(job)
    if job.status == IngestionStatus.paused:
        return await _pause_job(session=session, job=job, ingested=ingested)

    job.status = IngestionStatus.completed
    job.stage = "completed"
    job.progress = 1.0
    job.stats = {"ingested_documents": ingested, "total_documents": len(document_ids)}
    await session.commit()
    return {"ok": True, "ingested_documents": ingested}


def _parse_retry_after(value: str | None) -> float | None:
    if value is None:
        return None
    try:
        parsed = float(value)
    except ValueError:
        return None
    return parsed if parsed >= 0 else None


def _retry_delay_seconds(attempt: int, retry_after: str | None) -> float:
    parsed_retry_after = _parse_retry_after(retry_after)
    if parsed_retry_after is not None:
        return max(0.5, parsed_retry_after)
    return min(30.0, 1.0 * (2 ** (attempt - 1)))


async def _embed_with_rate_limit_retries(
    *,
    embedder: TextEmbedder,
    chunks: list[str],
    session: AsyncSession,
    job: IngestionJob,
) -> list[list[float]]:
    vectors: list[list[float]] = []

    for start in range(0, len(chunks), EMBED_BATCH_SIZE):
        batch = chunks[start : start + EMBED_BATCH_SIZE]
        batch_vectors = await _embed_batch_with_retries(
            embedder=embedder,
            batch=batch,
            session=session,
            job=job,
        )
        vectors.extend(batch_vectors)

    job.status = IngestionStatus.running
    job.error = None
    await session.commit()
    return vectors


@with_embedding_rate_limit_retries
async def _embed_batch_with_retries(
    *,
    embedder: TextEmbedder,
    batch: list[str],
    session: AsyncSession,
    job: IngestionJob,
) -> list[list[float]]:
    del session, job
    return await embedder.embed_texts(batch)
