from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.db.session import get_session
from src.models.entities import Document
from src.schemas.chat import ChatRequest, ChatResponse
from src.schemas.document import DocumentResponse
from src.schemas.draft import DraftRequest, DraftResponse
from src.schemas.search import SearchHit, SearchRequest, SearchResponse
from src.services.container import get_chat_pipeline, get_draft_service, get_retrieval_service

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
        tag=payload.tag,
        top_k=payload.top_k,
    )
    return SearchResponse(
        results=[
            SearchHit(
                chunk_id=item.chunk_id,
                document_id=item.document_id,
                filename=item.filename,
                tag=item.tag,
                score=item.score,
                text=item.text,
            )
            for item in results
        ],
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
        tag=payload.tag,
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
        tag=payload.tag,
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
