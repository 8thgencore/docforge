from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import get_session
from src.models.entities import Document, DocumentGroup
from src.schemas.group import (
    GroupCreateRequest,
    GroupDocumentsClearResponse,
    GroupResponse,
    GroupUpdateRequest,
)
from src.services.composition.container import get_qdrant_service

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    payload: GroupCreateRequest,
    session: AsyncSession = Depends(get_session),
) -> GroupResponse:
    existing = await session.scalar(select(DocumentGroup).where(DocumentGroup.name == payload.name))
    if existing:
        raise HTTPException(status_code=409, detail="group name already exists")

    group = DocumentGroup(name=payload.name, description=payload.description)
    session.add(group)
    await session.commit()
    await session.refresh(group)
    return GroupResponse.model_validate(group)


@router.get("", response_model=list[GroupResponse])
async def list_groups(session: AsyncSession = Depends(get_session)) -> list[GroupResponse]:
    groups = (await session.execute(select(DocumentGroup).order_by(DocumentGroup.created_at.desc()))).scalars()
    return [GroupResponse.model_validate(group) for group in groups]


@router.patch("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: UUID,
    payload: GroupUpdateRequest,
    session: AsyncSession = Depends(get_session),
) -> GroupResponse:
    group = await session.get(DocumentGroup, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="group not found")

    existing = await session.scalar(
        select(DocumentGroup).where(
            DocumentGroup.name == payload.name,
            DocumentGroup.id != group_id,
        ),
    )
    if existing:
        raise HTTPException(status_code=409, detail="group name already exists")

    group.name = payload.name
    group.description = payload.description
    await session.commit()
    await session.refresh(group)
    return GroupResponse.model_validate(group)


@router.delete("/{group_id}/documents", response_model=GroupDocumentsClearResponse)
async def clear_group_documents(
    group_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> GroupDocumentsClearResponse:
    group = await session.get(DocumentGroup, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="group not found")

    qdrant = get_qdrant_service()
    await qdrant.delete_group_points(group_id=group_id)

    result = await session.execute(delete(Document).where(Document.group_id == group_id))
    deleted_documents = int(result.rowcount or 0)
    await session.commit()

    return GroupDocumentsClearResponse(group_id=group_id, deleted_documents=deleted_documents)


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(group_id: UUID, session: AsyncSession = Depends(get_session)) -> Response:
    group = await session.get(DocumentGroup, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="group not found")

    qdrant = get_qdrant_service()
    await qdrant.delete_group_points(group_id=group_id)

    await session.delete(group)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
