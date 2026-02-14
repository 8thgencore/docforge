from __future__ import annotations

from collections.abc import Sequence
from uuid import UUID

from qdrant_client import AsyncQdrantClient
from qdrant_client import models as qm

from src.utils.qdrant_filters import build_scope_filter


class QdrantService:
    def __init__(self, url: str, collection: str, api_key: str | None = None) -> None:
        self.collection = collection
        self._client = AsyncQdrantClient(url=url, api_key=api_key)
        self._is_ready = False

    async def ensure_collection(self, vector_size: int) -> None:
        if self._is_ready:
            return
        collections = await self._client.get_collections()
        names = {item.name for item in collections.collections}
        if self.collection not in names:
            await self._client.create_collection(
                collection_name=self.collection,
                vectors_config=qm.VectorParams(size=vector_size, distance=qm.Distance.COSINE),
            )
        self._is_ready = True

    async def upsert_chunks(
        self,
        point_ids: Sequence[str],
        vectors: Sequence[list[float]],
        payloads: Sequence[dict],
    ) -> None:
        if not vectors:
            return
        await self.ensure_collection(vector_size=len(vectors[0]))
        points = [
            qm.PointStruct(id=point_id, vector=vector, payload=payload)
            for point_id, vector, payload in zip(point_ids, vectors, payloads, strict=True)
        ]
        await self._client.upsert(collection_name=self.collection, points=points)

    async def search(
        self,
        query_vector: list[float],
        group_id: UUID | None,
        category: str | None,
        limit: int,
    ) -> list[qm.ScoredPoint]:
        query_filter = build_scope_filter(group_id=group_id, category=category)
        try:
            return await self._client.search(
                collection_name=self.collection,
                query_vector=query_vector,
                query_filter=query_filter,
                limit=limit,
                with_payload=True,
            )
        except Exception:
            # First-run bootstraps may query before any collection exists.
            return []
