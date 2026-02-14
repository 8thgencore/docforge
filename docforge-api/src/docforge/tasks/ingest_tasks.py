from __future__ import annotations

import asyncio
import logging
import uuid
from pathlib import Path

from docforge.core.config import get_settings
from docforge.db.session import AsyncSessionLocal
from docforge.models.entities import (
    Document,
    DocumentChunk,
    DocumentStatus,
    IngestionJob,
    IngestionStatus,
)
from docforge.services.container import get_ollama_client, get_qdrant_service
from docforge.services.parser import parse_document
from docforge.tasks.broker import broker
from docforge.utils.chunking import iter_chunks

logger = logging.getLogger(__name__)
settings = get_settings()


@broker.task(task_name="ingest_documents")
async def ingest_documents_task(job_id: str, document_ids: list[str]) -> dict:
    async with AsyncSessionLocal() as session:
        job_uuid = uuid.UUID(job_id)
        job = await session.get(IngestionJob, job_uuid)
        if job is None:
            logger.error("ingestion job %s not found", job_id)
            return {"ok": False, "reason": "job_not_found"}

        job.status = IngestionStatus.running
        job.stage = "parsing"
        job.progress = 0.05
        job.error = None
        await session.commit()

        ollama = get_ollama_client()
        qdrant = get_qdrant_service()
        ingested = 0

        try:
            for index, raw_document_id in enumerate(document_ids):
                document = await session.get(Document, uuid.UUID(raw_document_id))
                if document is None:
                    continue

                parsed = await asyncio.to_thread(parse_document, Path(document.source_uri))
                chunks = [
                    chunk for _, chunk in iter_chunks(parsed.text, settings.max_chunk_chars, settings.chunk_overlap)
                ]
                if not chunks:
                    document.status = DocumentStatus.failed
                    continue

                vectors = await ollama.embed_texts(chunks)
                point_ids: list[str] = []
                payloads: list[dict] = []

                for chunk_index, chunk_text in enumerate(chunks):
                    chunk_id = uuid.uuid4()
                    point_id = str(chunk_id)
                    db_chunk = DocumentChunk(
                        id=chunk_id,
                        document_id=document.id,
                        chunk_index=chunk_index,
                        text=chunk_text,
                        token_count=len(chunk_text.split()),
                        meta=parsed.metadata,
                        qdrant_point_id=point_id,
                    )
                    session.add(db_chunk)

                    point_ids.append(point_id)
                    payloads.append(
                        {
                            "group_id": str(document.group_id),
                            "document_id": str(document.id),
                            "chunk_id": point_id,
                            "filename": document.filename,
                            "category": document.category,
                            "text": chunk_text,
                        },
                    )

                await session.flush()
                await qdrant.upsert_chunks(point_ids=point_ids, vectors=vectors, payloads=payloads)

                document.language = parsed.language
                document.status = DocumentStatus.indexed
                ingested += 1

                job.progress = min(0.95, (index + 1) / max(1, len(document_ids)))
                job.stage = "indexing"
                await session.commit()

            job.status = IngestionStatus.completed
            job.stage = "completed"
            job.progress = 1.0
            job.stats = {"ingested_documents": ingested, "total_documents": len(document_ids)}
            await session.commit()
            return {"ok": True, "ingested_documents": ingested}

        except Exception as exc:
            logger.exception("ingestion failed for job %s", job_id)
            job.status = IngestionStatus.failed
            job.stage = "failed"
            job.error = str(exc)
            await session.commit()
            raise
