from __future__ import annotations

from collections.abc import Sequence
from typing import Any

import httpx


class OllamaClient:
    def __init__(self, base_url: str, chat_model: str, embed_model: str, timeout: float = 120.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._chat_model = chat_model
        self._embed_model = embed_model
        self._timeout = timeout

    async def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        embeddings: list[list[float]] = []
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            for text in texts:
                response = await client.post(
                    f"{self._base_url}/api/embeddings",
                    json={"model": self._embed_model, "prompt": text},
                )
                response.raise_for_status()
                payload = response.json()
                vector = payload.get("embedding")
                if not isinstance(vector, list):
                    raise RuntimeError("Ollama embeddings response missing vector")
                embeddings.append([float(v) for v in vector])
        return embeddings

    async def check_connection(self) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.get(f"{self._base_url}/api/tags")
            response.raise_for_status()
            payload = response.json()
            models = payload.get("models")
            if not isinstance(models, list):
                raise RuntimeError("Ollama tags response missing models list")

            model_names = {
                str(item.get("name"))
                for item in models
                if isinstance(item, dict) and isinstance(item.get("name"), str)
            }
            exact_match = self._embed_model in model_names
            with_latest_match = f"{self._embed_model}:latest" in model_names
            embed_model_available = exact_match or with_latest_match

            return {
                "provider": "ollama",
                "base_url": self._base_url,
                "embed_model": self._embed_model,
                "embed_model_available": embed_model_available,
                "available_models": sorted(model_names),
            }

    async def generate(self, prompt: str, system: str | None = None) -> str:
        final_prompt = prompt
        if system:
            final_prompt = f"{system}\n\n{prompt}"
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(
                f"{self._base_url}/api/generate",
                json={"model": self._chat_model, "prompt": final_prompt, "stream": False},
            )
            response.raise_for_status()
            payload = response.json()
            result = payload.get("response")
            if not isinstance(result, str):
                raise RuntimeError("Ollama generation response missing text")
            return result.strip()
