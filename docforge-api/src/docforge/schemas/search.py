from uuid import UUID

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query: str = Field(min_length=1)
    group_id: UUID | None = None
    category: str | None = None
    top_k: int = Field(default=8, ge=1, le=30)


class SearchHit(BaseModel):
    chunk_id: UUID
    document_id: UUID
    filename: str
    category: str | None
    score: float
    text: str


class SearchResponse(BaseModel):
    results: list[SearchHit]
