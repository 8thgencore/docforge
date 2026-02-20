from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel


class EmbeddingHealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    provider: str
    message: str
    checked_at: datetime
    details: dict[str, Any] | None = None
