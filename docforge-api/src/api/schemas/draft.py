from uuid import UUID

from pydantic import AliasChoices, BaseModel, Field

from src.api.schemas.chat import Citation


class DraftRequest(BaseModel):
    group_id: UUID
    tag: str = Field(validation_alias=AliasChoices("tag", "category"))
    prompt: str = Field(min_length=1)
    length: str = "medium"
    tone: str = "neutral"
    format: str = "report"


class DraftResponse(BaseModel):
    title: str
    sections: list[str]
    citations: list[Citation]
    warnings: list[str]
