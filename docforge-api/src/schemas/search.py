from uuid import UUID

from pydantic import AliasChoices, BaseModel, Field


class SearchRequest(BaseModel):
    query: str = Field(min_length=1)
    group_id: UUID | None = None
    tag: str | None = Field(default=None, validation_alias=AliasChoices("tag", "category"))
    top_k: int = Field(default=8, ge=1, le=30)


class SearchHit(BaseModel):
    chunk_id: UUID
    document_id: UUID
    filename: str
    tag: str | None
    score: float
    text: str


class SearchResponse(BaseModel):
    results: list[SearchHit]
