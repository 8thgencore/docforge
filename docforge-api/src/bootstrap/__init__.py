"""Dependency wiring and object factories."""

from src.bootstrap.container import (
    get_chat_pipeline,
    get_draft_service,
    get_lmstudio_client,
    get_ollama_client,
    get_openai_client,
    get_qdrant_service,
    get_retrieval_service,
    get_text_embedder,
    get_text_generator,
)

__all__ = [
    "get_chat_pipeline",
    "get_draft_service",
    "get_lmstudio_client",
    "get_openai_client",
    "get_ollama_client",
    "get_qdrant_service",
    "get_retrieval_service",
    "get_text_embedder",
    "get_text_generator",
]
