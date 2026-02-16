from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol


class TextEmbedder(Protocol):
    async def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        """Build embeddings for input texts."""


class TextGenerator(Protocol):
    async def generate(self, prompt: str, system: str | None = None) -> str:
        """Generate text from prompt (+ optional system instruction)."""
