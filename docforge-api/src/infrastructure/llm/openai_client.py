from __future__ import annotations

import asyncio
from collections.abc import Sequence

import httpx


class OpenAIClient:
    def __init__(
        self,
        api_key: str,
        chat_model: str,
        embed_model: str,
        base_url: str = "https://api.openai.com/v1",
        timeout: float = 120.0,
    ) -> None:
        self._api_key = api_key
        self._chat_model = chat_model
        self._embed_model = embed_model
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    async def _post_json(self, endpoint: str, payload: dict, max_attempts: int = 3) -> dict:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            for attempt in range(1, max_attempts + 1):
                response = await client.post(
                    f"{self._base_url}{endpoint}",
                    headers=self._headers(),
                    json=payload,
                )
                try:
                    response.raise_for_status()
                    data = response.json()
                    if not isinstance(data, dict):
                        raise RuntimeError("OpenAI response must be an object")
                    return data
                except httpx.HTTPStatusError:
                    is_retryable = response.status_code in {429, 500, 502, 503, 504}
                    if not is_retryable or attempt >= max_attempts:
                        raise
                    retry_after = response.headers.get("retry-after")
                    if retry_after and retry_after.isdigit():
                        delay = max(0.2, float(retry_after))
                    else:
                        delay = min(2.0, 0.5 * (2 ** (attempt - 1)))
                    await asyncio.sleep(delay)

        raise RuntimeError("OpenAI request failed after retries")

    async def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        if not texts:
            return []
        payload = await self._post_json("/embeddings", {"model": self._embed_model, "input": list(texts)})

        raw_data = payload.get("data")
        if not isinstance(raw_data, list):
            raise RuntimeError("OpenAI embeddings response missing data")

        vectors: list[list[float]] = []
        for item in raw_data:
            if not isinstance(item, dict):
                continue
            vector = item.get("embedding")
            if not isinstance(vector, list):
                raise RuntimeError("OpenAI embeddings response item missing vector")
            vectors.append([float(v) for v in vector])
        return vectors

    async def generate(self, prompt: str, system: str | None = None) -> str:
        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = await self._post_json(
            "/chat/completions",
            {"model": self._chat_model, "messages": messages, "temperature": 0.2},
        )

        choices = payload.get("choices")
        if not isinstance(choices, list) or not choices:
            raise RuntimeError("OpenAI chat response missing choices")

        first_choice = choices[0]
        if not isinstance(first_choice, dict):
            raise RuntimeError("OpenAI chat response malformed choice")

        message = first_choice.get("message")
        if not isinstance(message, dict):
            raise RuntimeError("OpenAI chat response missing message")

        content = message.get("content")
        if isinstance(content, str):
            return content.strip()

        raise RuntimeError("OpenAI chat response missing text content")
