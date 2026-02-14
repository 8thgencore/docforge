from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from src.models.entities import DocumentStatus, SourceType


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    group_id: UUID
    tag: str | None
    source_type: SourceType
    source_uri: str
    filename: str
    checksum: str
    mime_type: str | None
    language: str | None
    status: DocumentStatus
    created_at: datetime
