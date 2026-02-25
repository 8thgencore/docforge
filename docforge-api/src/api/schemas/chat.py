from uuid import UUID

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    query: str = Field(min_length=1)
    session_id: str | None = None
    group_id: UUID | None = None
    top_k: int = Field(default=8, ge=1, le=30)


class Citation(BaseModel):
    index: int | None = None
    document_id: UUID
    chunk_id: UUID
    filename: str
    score: float
    group_id: UUID | None = None
    group_name: str | None = None
    document_url: str | None = None
    snippet: str | None = None
    chunk_index: int | None = None


class ChatQuality(BaseModel):
    low_confidence: bool
    reason: str
    best_score: float | None = None
    used_chunks: int = 0


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]
    insufficient_context: bool
    quality: ChatQuality
