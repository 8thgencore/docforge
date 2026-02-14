from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import get_session
from src.models.entities import Document, DocumentTag
from src.schemas.tag import TagCreateRequest, TagResponse, TagUpdateRequest

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=list[TagResponse])
async def list_tags(
    q: str | None = Query(default=None, min_length=1),
    limit: int = Query(default=25, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
) -> list[TagResponse]:
    stmt = select(DocumentTag).order_by(DocumentTag.name.asc()).limit(limit)
    if q:
        stmt = stmt.where(DocumentTag.name.ilike(f"%{q.strip()}%"))
    tags = (await session.execute(stmt)).scalars().all()
    return [TagResponse.model_validate(item) for item in tags]


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    payload: TagCreateRequest,
    session: AsyncSession = Depends(get_session),
) -> TagResponse:
    normalized_name = payload.name.strip()
    existing = await session.scalar(select(DocumentTag).where(DocumentTag.name == normalized_name))
    if existing:
        raise HTTPException(status_code=409, detail="tag already exists")

    tag = DocumentTag(name=normalized_name)
    session.add(tag)
    await session.commit()
    await session.refresh(tag)
    return TagResponse.model_validate(tag)


@router.patch("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: UUID,
    payload: TagUpdateRequest,
    session: AsyncSession = Depends(get_session),
) -> TagResponse:
    tag = await session.get(DocumentTag, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="tag not found")

    normalized_name = payload.name.strip()
    existing = await session.scalar(select(DocumentTag).where(DocumentTag.name == normalized_name, DocumentTag.id != tag_id))
    if existing:
        raise HTTPException(status_code=409, detail="tag already exists")

    old_name = tag.name
    tag.name = normalized_name

    documents = (await session.execute(select(Document).where(Document.tag == old_name))).scalars().all()
    for document in documents:
        document.tag = normalized_name

    await session.commit()
    await session.refresh(tag)
    return TagResponse.model_validate(tag)


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(tag_id: UUID, session: AsyncSession = Depends(get_session)) -> Response:
    tag = await session.get(DocumentTag, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="tag not found")

    documents = (await session.execute(select(Document).where(Document.tag == tag.name))).scalars().all()
    for document in documents:
        document.tag = None

    await session.delete(tag)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
