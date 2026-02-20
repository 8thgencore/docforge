from functools import lru_cache
from typing import Any

from src.application.chat_pipeline import ChatPipeline
from src.application.draft_service import DraftService
from src.application.ports.llm import TextEmbedder, TextGenerator
from src.application.retrieval import RetrievalService
from src.core.config import get_settings
from src.infrastructure.llm.lmstudio_client import LMStudioClient
from src.infrastructure.llm.ollama_client import OllamaClient
from src.infrastructure.llm.openai_client import OpenAIClient
from src.infrastructure.vector_store.qdrant_service import QdrantService


@lru_cache(maxsize=1)
def get_ollama_client() -> OllamaClient:
    settings = get_settings()
    return OllamaClient(
        base_url=settings.ollama_base_url,
        chat_model=settings.ollama_chat_model,
        embed_model=settings.ollama_embed_model,
    )


@lru_cache(maxsize=1)
def get_openai_client() -> OpenAIClient:
    settings = get_settings()
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is required when LLM_PROVIDER=openai")
    return OpenAIClient(
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url,
        chat_model=settings.openai_chat_model,
        embed_model=settings.openai_embed_model,
    )


@lru_cache(maxsize=1)
def get_lmstudio_client() -> LMStudioClient:
    settings = get_settings()
    return LMStudioClient(
        base_url=settings.lmstudio_base_url,
        chat_model=settings.lmstudio_chat_model,
        embed_model=settings.lmstudio_embed_model,
    )


def _provider_name() -> str:
    provider = get_settings().llm_provider.strip().lower()
    if provider not in {"ollama", "openai", "lmstudio"}:
        raise RuntimeError("LLM_PROVIDER must be one of: 'ollama', 'openai', 'lmstudio'")
    return provider


def _get_llm_client() -> Any:
    provider = _provider_name()
    if provider == "openai":
        return get_openai_client()
    if provider == "lmstudio":
        return get_lmstudio_client()
    return get_ollama_client()


@lru_cache(maxsize=1)
def get_text_generator() -> TextGenerator:
    return _get_llm_client()


@lru_cache(maxsize=1)
def get_text_embedder() -> TextEmbedder:
    return _get_llm_client()


@lru_cache(maxsize=1)
def get_qdrant_service() -> QdrantService:
    settings = get_settings()
    return QdrantService(
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key,
        collection=settings.qdrant_collection,
    )


@lru_cache(maxsize=1)
def get_retrieval_service() -> RetrievalService:
    return RetrievalService(qdrant=get_qdrant_service(), embedder=get_text_embedder())


@lru_cache(maxsize=1)
def get_chat_pipeline() -> ChatPipeline:
    settings = get_settings()
    return ChatPipeline(
        retrieval=get_retrieval_service(),
        generator=get_text_generator(),
        low_confidence_threshold=settings.low_confidence_threshold,
    )


@lru_cache(maxsize=1)
def get_draft_service() -> DraftService:
    return DraftService(retrieval=get_retrieval_service(), generator=get_text_generator())
