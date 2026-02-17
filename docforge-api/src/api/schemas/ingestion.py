from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from src.infrastructure.persistence.models.entities import IngestionStage, IngestionStatus


class IngestionCreatedResponse(BaseModel):
    ingestion_id: UUID
    task_id: str | None
    status: IngestionStatus


class IngestionStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    task_id: str | None
    group_id: UUID
    status: IngestionStatus
    stage: IngestionStage
    progress: float
    error: str | None
    stats: dict | None
    created_at: datetime
    updated_at: datetime
