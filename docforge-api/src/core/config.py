from functools import lru_cache
from pathlib import Path
from urllib.parse import quote_plus

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="DB_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    driver: str = "postgresql+asyncpg"
    name: str = "docforge"
    user: str = "docforge"
    password: str = "docforge"
    host: str | None = None
    port: int = 5432

    def build_url(self, default_host: str) -> str:
        host = self.host or default_host
        return f"{self.driver}://{quote_plus(self.user)}:{quote_plus(self.password)}@{host}:{self.port}/{self.name}"


class RedisSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="REDIS_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    scheme: str = "redis"
    host: str | None = None
    port: int = 6379
    db: int = 0
    password: str | None = None

    def build_url(self, default_host: str) -> str:
        host = self.host or default_host
        if self.password:
            return f"{self.scheme}://:{quote_plus(self.password)}@{host}:{self.port}/{self.db}"
        return f"{self.scheme}://{host}:{self.port}/{self.db}"


class QdrantSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="QDRANT_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    scheme: str = "http"
    host: str | None = None
    port: int = 6333
    collection: str = "docforge_chunks"
    api_key: str | None = None

    def build_url(self, default_host: str) -> str:
        host = self.host or default_host
        return f"{self.scheme}://{host}:{self.port}"


class StorageSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    storage_path: Path = Field(default=Path("./data/storage"), validation_alias="STORAGE_PATH")
    upload_path: Path = Field(default=Path("./data/uploads"), validation_alias="UPLOAD_PATH")


class OllamaSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="OLLAMA_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    base_url: str = "http://localhost:11434"
    chat_model: str = "qwen2.5:7b-instruct"
    embed_model: str = "bge-m3"


class OpenAISettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="OPENAI_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    api_key: str | None = None
    base_url: str = "https://api.openai.com/v1"
    chat_model: str = "gpt-4o-mini"
    embed_model: str = "text-embedding-3-small"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "DocForge RAG"
    environment: str = "dev"
    api_v1_prefix: str = "/v1"
    api_key: str | None = None
    cors_allow_origins: str = "http://localhost:5173"

    db: DatabaseSettings = Field(default_factory=DatabaseSettings)
    redis: RedisSettings = Field(default_factory=RedisSettings)
    qdrant: QdrantSettings = Field(default_factory=QdrantSettings)
    storage: StorageSettings = Field(default_factory=StorageSettings)
    ollama: OllamaSettings = Field(default_factory=OllamaSettings)
    openai: OpenAISettings = Field(default_factory=OpenAISettings)

    llm_provider: str = "ollama"

    max_chunk_chars: int = 1200
    chunk_overlap: int = 200
    default_top_k: int = 8
    low_confidence_threshold: float = 0.35

    sqlalchemy_echo: bool = False

    @staticmethod
    def _default_host(service_name: str) -> str:
        if Path("/.dockerenv").exists():
            return service_name
        return "localhost"

    @property
    def database_url(self) -> str:
        return self.db.build_url(default_host=self._default_host("db"))

    @property
    def redis_url(self) -> str:
        return self.redis.build_url(default_host=self._default_host("redis"))

    @property
    def qdrant_url(self) -> str:
        return self.qdrant.build_url(default_host=self._default_host("qdrant"))

    @property
    def qdrant_collection(self) -> str:
        return self.qdrant.collection

    @property
    def qdrant_api_key(self) -> str | None:
        return self.qdrant.api_key

    @property
    def storage_path(self) -> Path:
        return self.storage.storage_path

    @property
    def upload_path(self) -> Path:
        return self.storage.upload_path

    @property
    def ollama_base_url(self) -> str:
        return self.ollama.base_url

    @property
    def ollama_chat_model(self) -> str:
        return self.ollama.chat_model

    @property
    def ollama_embed_model(self) -> str:
        return self.ollama.embed_model

    @property
    def openai_api_key(self) -> str | None:
        return self.openai.api_key

    @property
    def openai_base_url(self) -> str:
        return self.openai.base_url

    @property
    def openai_chat_model(self) -> str:
        return self.openai.chat_model

    @property
    def openai_embed_model(self) -> str:
        return self.openai.embed_model

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allow_origins.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
