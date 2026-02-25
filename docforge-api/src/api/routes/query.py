from datetime import UTC, datetime
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas.chat import ChatRequest, ChatResponse
from src.api.schemas.document import DocumentResponse
from src.api.schemas.draft import DraftRequest, DraftResponse
from src.api.schemas.health import EmbeddingHealthResponse
from src.api.schemas.search import SearchChunkHit, SearchHit, SearchRequest, SearchResponse
from src.bootstrap.container import get_chat_pipeline, get_draft_service, get_retrieval_service, get_text_embedder
from src.core.config import get_settings
from src.infrastructure.persistence.db.session import get_session
from src.infrastructure.persistence.models.entities import Document, DocumentGroup

router = APIRouter(tags=["rag"])


@router.post("/search", response_model=SearchResponse)
async def search_documents(
    payload: SearchRequest,
    session: AsyncSession = Depends(get_session),
) -> SearchResponse:
    retrieval = get_retrieval_service()
    results = await retrieval.retrieve(
        session=session,
        query=payload.query,
        group_id=payload.group_id,
        top_k=max(payload.top_k * 3, payload.top_k),
    )

    document_ids = {item.document_id for item in results}
    document_meta: dict[UUID, tuple[UUID, str, datetime]] = {}
    if document_ids:
        stmt = (
            select(Document.id, Document.group_id, Document.created_at, DocumentGroup.name)
            .join(DocumentGroup, DocumentGroup.id == Document.group_id)
            .where(Document.id.in_(document_ids))
        )
        rows = (await session.execute(stmt)).all()
        for document_id, group_id, created_at, group_name in rows:
            document_meta[document_id] = (group_id, group_name, created_at)

    grouped_by_document: dict[UUID, SearchHit] = {}
    for item in results:
        group_id, group_name, created_at = document_meta.get(item.document_id, (None, None, None))
        existing = grouped_by_document.get(item.document_id)
        chunk = SearchChunkHit(
            chunk_id=item.chunk_id,
            score=item.score,
            text=item.text,
        )
        if existing is None:
            grouped_by_document[item.document_id] = SearchHit(
                document_id=item.document_id,
                group_id=group_id,
                group_name=group_name,
                created_at=created_at,
                filename=item.filename,
                score=item.score,
                chunks=[chunk],
            )
            continue
        existing.chunks.append(chunk)
        if chunk.score > existing.score:
            existing.score = chunk.score

    grouped_results = sorted(grouped_by_document.values(), key=lambda item: item.score, reverse=True)[: payload.top_k]

    for result in grouped_results:
        result.chunks.sort(key=lambda chunk: chunk.score, reverse=True)

    return SearchResponse(
        results=grouped_results,
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, session: AsyncSession = Depends(get_session)) -> ChatResponse:
    settings = get_settings()
    top_k = payload.top_k or settings.default_top_k

    pipeline = get_chat_pipeline()
    answer, citations, insufficient_context = await pipeline.run(
        session=session,
        query=payload.query,
        group_id=payload.group_id,
        top_k=top_k,
    )
    return ChatResponse(answer=answer, citations=citations, insufficient_context=insufficient_context)


@router.post("/drafts/generate", response_model=DraftResponse)
async def generate_draft(
    payload: DraftRequest,
    session: AsyncSession = Depends(get_session),
) -> DraftResponse:
    draft_service = get_draft_service()
    return await draft_service.generate_draft(
        session=session,
        group_id=payload.group_id,
        prompt=payload.prompt,
        length=payload.length,
        tone=payload.tone,
        format_name=payload.format,
    )


@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: UUID, session: AsyncSession = Depends(get_session)) -> DocumentResponse:
    document = await session.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="document not found")
    return DocumentResponse.model_validate(document)


@router.get("/health")
async def health(session: AsyncSession = Depends(get_session)) -> dict:
    await session.execute(text("SELECT 1"))
    return {"status": "ok"}


@router.get("/health/embedding", response_model=EmbeddingHealthResponse)
async def embedding_health() -> EmbeddingHealthResponse:
    settings = get_settings()
    embedder = get_text_embedder()
    provider = settings.llm_provider.lower()
    checked_at = datetime.now(UTC)

    try:
        details = await embedder.check_connection()
        message = "Embedding provider is available"
        if details.get("embed_model_available") is False:
            message = "Embedding provider is reachable, but the configured embedding model is not available"
            return EmbeddingHealthResponse(
                status="degraded",
                provider=provider,
                message=message,
                checked_at=checked_at,
                details=details,
            )
        return EmbeddingHealthResponse(
            status="ok",
            provider=provider,
            message=message,
            checked_at=checked_at,
            details=details,
        )
    except (httpx.RequestError, httpx.HTTPStatusError, RuntimeError, ValueError) as exc:
        return EmbeddingHealthResponse(
            status="degraded",
            provider=provider,
            message=f"Embedding provider unavailable: {exc}",
            checked_at=checked_at,
        )
