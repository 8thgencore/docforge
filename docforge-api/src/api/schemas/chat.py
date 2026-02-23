from uuid import UUID

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    query: str = Field(min_length=1)
    session_id: str | None = None
    group_id: UUID | None = None
    top_k: int = Field(default=8, ge=1, le=30)


class Citation(BaseModel):
    document_id: UUID
    chunk_id: UUID
    filename: str
    score: float


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]
    insufficient_context: bool
