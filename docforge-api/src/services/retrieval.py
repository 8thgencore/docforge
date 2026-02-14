from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.entities import Document, DocumentChunk
from src.services.ollama import OllamaClient
from src.services.qdrant import QdrantService
from src.utils.lexical import lexical_score


@dataclass(slots=True)
class RetrievedChunk:
    chunk_id: UUID
    document_id: UUID
    filename: str
    tag: str | None
    text: str
    score: float


class RetrievalService:
    def __init__(self, qdrant: QdrantService, ollama: OllamaClient) -> None:
        self._qdrant = qdrant
        self._ollama = ollama

    async def retrieve(
        self,
        session: AsyncSession,
        query: str,
        group_id: UUID | None,
        tag: str | None,
        top_k: int,
    ) -> list[RetrievedChunk]:
        query_vector = (await self._ollama.embed_texts([query]))[0]
        vector_hits = await self._qdrant.search(
            query_vector=query_vector,
            group_id=group_id,
            tag=tag,
            limit=max(top_k * 2, 12),
        )

        merged: dict[UUID, RetrievedChunk] = {}

        for hit in vector_hits:
            payload = hit.payload or {}
            chunk_id = _parse_uuid(payload.get("chunk_id"))
            document_id = _parse_uuid(payload.get("document_id"))
            if chunk_id is None or document_id is None:
                continue
            merged[chunk_id] = RetrievedChunk(
                chunk_id=chunk_id,
                document_id=document_id,
                filename=str(payload.get("filename", "unknown")),
                tag=payload.get("tag"),
                text=str(payload.get("text", "")),
                score=float(hit.score) * 0.7,
            )

        lexical_candidates = await self._load_lexical_candidates(
            session=session,
            query=query,
            group_id=group_id,
            tag=tag,
            candidate_limit=max(top_k * 25, 200),
        )

        for lexical in lexical_candidates:
            if lexical.score <= 0:
                continue
            if lexical.chunk_id in merged:
                existing = merged[lexical.chunk_id]
                existing.score += lexical.score * 0.3
                continue
            merged[lexical.chunk_id] = RetrievedChunk(
                chunk_id=lexical.chunk_id,
                document_id=lexical.document_id,
                filename=lexical.filename,
                tag=lexical.tag,
                text=lexical.text,
                score=lexical.score * 0.3,
            )

        ranked = sorted(merged.values(), key=lambda item: item.score, reverse=True)
        return ranked[:top_k]

    async def _load_lexical_candidates(
        self,
        session: AsyncSession,
        query: str,
        group_id: UUID | None,
        tag: str | None,
        candidate_limit: int,
    ) -> list[RetrievedChunk]:
        stmt = (
            select(DocumentChunk, Document)
            .join(Document, Document.id == DocumentChunk.document_id)
            .order_by(DocumentChunk.created_at.desc())
            .limit(candidate_limit)
        )
        if group_id is not None:
            stmt = stmt.where(Document.group_id == group_id)
        if tag:
            stmt = stmt.where(Document.tag == tag)

        rows = (await session.execute(stmt)).all()
        results: list[RetrievedChunk] = []
        for chunk, document in rows:
            score = lexical_score(query=query, text=chunk.text)
            if score <= 0:
                continue
            results.append(
                RetrievedChunk(
                    chunk_id=chunk.id,
                    document_id=document.id,
                    filename=document.filename,
                    tag=document.tag,
                    text=chunk.text,
                    score=score,
                ),
            )
        return results


def _parse_uuid(value: Any) -> UUID | None:
    if value is None:
        return None
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError):
        return None
