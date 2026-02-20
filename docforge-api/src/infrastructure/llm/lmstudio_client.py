from __future__ import annotations

from collections.abc import Sequence
from typing import Any

import httpx


class LMStudioClient:
    def __init__(self, base_url: str, chat_model: str, embed_model: str, timeout: float = 120.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._chat_model = chat_model
        self._embed_model = embed_model
        self._timeout = timeout

    async def _get_json(self, endpoint: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.get(f"{self._base_url}{endpoint}")
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, dict):
                raise RuntimeError("LM Studio response must be an object")
            return payload

    async def _post_json(self, endpoint: str, payload: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(f"{self._base_url}{endpoint}", json=payload)
            response.raise_for_status()
            data = response.json()
            if not isinstance(data, dict):
                raise RuntimeError("LM Studio response must be an object")
            return data

    async def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        if not texts:
            return []
        payload = await self._post_json("/v1/embeddings", {"model": self._embed_model, "input": list(texts)})
        data = payload.get("data")
        if not isinstance(data, list):
            raise RuntimeError("LM Studio embeddings response missing data")

        vectors: list[list[float]] = []
        for item in data:
            if not isinstance(item, dict):
                continue
            vector = item.get("embedding")
            if not isinstance(vector, list):
                raise RuntimeError("LM Studio embeddings response item missing vector")
            vectors.append([float(v) for v in vector])
        return vectors

    async def generate(self, prompt: str, system: str | None = None) -> str:
        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = await self._post_json(
            "/v1/chat/completions",
            {"model": self._chat_model, "messages": messages, "temperature": 0.2},
        )

        choices = payload.get("choices")
        if not isinstance(choices, list) or not choices:
            raise RuntimeError("LM Studio chat response missing choices")

        first_choice = choices[0]
        if not isinstance(first_choice, dict):
            raise RuntimeError("LM Studio chat response malformed choice")

        message = first_choice.get("message")
        if not isinstance(message, dict):
            raise RuntimeError("LM Studio chat response missing message")

        content = message.get("content")
        if isinstance(content, str):
            return content.strip()

        raise RuntimeError("LM Studio chat response missing text content")

    async def check_connection(self) -> dict[str, Any]:
        payload = await self._get_json("/v1/models")
        data = payload.get("data")
        if not isinstance(data, list):
            raise RuntimeError("LM Studio models response missing data")

        model_names = {item["id"] for item in data if isinstance(item, dict) and isinstance(item.get("id"), str)}
        exact_match = self._embed_model in model_names
        with_latest_match = f"{self._embed_model}:latest" in model_names
        embed_model_available = exact_match or with_latest_match

        return {
            "provider": "lmstudio",
            "base_url": self._base_url,
            "embed_model": self._embed_model,
            "embed_model_available": embed_model_available,
            "available_models": sorted(model_names),
        }
