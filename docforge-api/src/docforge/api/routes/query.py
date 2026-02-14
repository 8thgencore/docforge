from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from docforge.core.config import get_settings
from docforge.db.session import get_session
from docforge.models.entities import Document
from docforge.schemas.chat import ChatRequest, ChatResponse
from docforge.schemas.document import DocumentResponse
from docforge.schemas.draft import DraftRequest, DraftResponse
from docforge.schemas.search import SearchHit, SearchRequest, SearchResponse
from docforge.services.container import get_chat_pipeline, get_draft_service, get_retrieval_service

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
        category=payload.category,
        top_k=payload.top_k,
    )
    return SearchResponse(
        results=[
            SearchHit(
                chunk_id=item.chunk_id,
                document_id=item.document_id,
                filename=item.filename,
                category=item.category,
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
        category=payload.category,
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
        category=payload.category,
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
