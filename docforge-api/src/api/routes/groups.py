from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import get_session
from src.models.entities import DocumentGroup
from src.schemas.group import GroupCreateRequest, GroupResponse

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
