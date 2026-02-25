from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query: str = Field(min_length=1)
    group_id: UUID | None = None
    top_k: int = Field(default=8, ge=1, le=30)


class SearchChunkHit(BaseModel):
    chunk_id: UUID
    score: float
    text: str


class SearchHit(BaseModel):
    document_id: UUID
    group_id: UUID | None = None
    group_name: str | None = None
    created_at: datetime | None = None
    filename: str
    score: float
    chunks: list[SearchChunkHit]


class SearchResponse(BaseModel):
    results: list[SearchHit]
