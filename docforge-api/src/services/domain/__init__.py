"""Domain-layer contracts used by application services."""

from src.services.domain.llm_protocols import TextEmbedder, TextGenerator

__all__ = ["TextEmbedder", "TextGenerator"]
