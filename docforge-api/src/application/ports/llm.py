from __future__ import annotations

from collections.abc import Sequence
from typing import Any, Protocol


class TextEmbedder(Protocol):
    async def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        """Build embeddings for input texts."""

    async def check_connection(self) -> dict[str, Any]:
        """Check embedding provider connection and return diagnostic details."""


class TextGenerator(Protocol):
    async def generate(self, prompt: str, system: str | None = None) -> str:
        """Generate text from prompt (+ optional system instruction)."""
