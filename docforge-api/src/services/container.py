from functools import lru_cache

from src.core.config import get_settings
from src.services.draft import DraftService
from src.services.langgraph_chat import ChatPipeline
from src.services.ollama import OllamaClient
from src.services.qdrant import QdrantService
from src.services.retrieval import RetrievalService


@lru_cache(maxsize=1)
def get_ollama_client() -> OllamaClient:
    settings = get_settings()
    return OllamaClient(
        base_url=settings.ollama_base_url,
        chat_model=settings.ollama_chat_model,
        embed_model=settings.ollama_embed_model,
    )


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
    return RetrievalService(qdrant=get_qdrant_service(), ollama=get_ollama_client())


@lru_cache(maxsize=1)
def get_chat_pipeline() -> ChatPipeline:
    settings = get_settings()
    return ChatPipeline(
        retrieval=get_retrieval_service(),
        ollama=get_ollama_client(),
        low_confidence_threshold=settings.low_confidence_threshold,
    )


@lru_cache(maxsize=1)
def get_draft_service() -> DraftService:
    return DraftService(retrieval=get_retrieval_service(), ollama=get_ollama_client())
