import uuid

import pytest

from src.application.chat_pipeline import (
    QUALITY_REASON_INSUFFICIENT_CONTEXT,
    QUALITY_REASON_NO_RELEVANT_CHUNKS,
    QUALITY_REASON_OK,
    ChatPipeline,
)
from src.application.retrieval import RetrievedChunk


class FakeRetrievalLow:
    async def retrieve(self, session, query, group_id, top_k):
        return [
            RetrievedChunk(
                chunk_id=uuid.uuid4(),
                document_id=uuid.uuid4(),
                filename="a.txt",
                text="short context",
                score=0.1,
            ),
        ]


class FakeRetrievalHigh:
    async def retrieve(self, session, query, group_id, top_k):
        return [
            RetrievedChunk(
                chunk_id=uuid.uuid4(),
                document_id=uuid.uuid4(),
                filename="a.txt",
                text="relevant context",
                score=0.9,
            ),
        ]


class FakeRetrievalEmpty:
    async def retrieve(self, session, query, group_id, top_k):
        return []


class FakeGenerator:
    async def generate(self, prompt: str, system: str | None = None) -> str:
        return "answer [1]"


@pytest.mark.asyncio
async def test_chat_pipeline_generates_answer_for_low_score_with_warning_flag() -> None:
    pipeline = ChatPipeline(retrieval=FakeRetrievalLow(), generator=FakeGenerator(), low_confidence_threshold=0.35)
    result = await pipeline._run_fallback(
        session=None,
        query="question",
        group_id=None,
        top_k=4,
    )

    assert result.low_confidence is True
    assert result.quality_reason == QUALITY_REASON_INSUFFICIENT_CONTEXT
    assert result.answer == "answer [1]"
    assert len(result.retrieved) == 1


@pytest.mark.asyncio
async def test_chat_pipeline_generates_when_confident() -> None:
    pipeline = ChatPipeline(
        retrieval=FakeRetrievalHigh(),
        generator=FakeGenerator(),
        low_confidence_threshold=0.35,
    )
    result = await pipeline._run_fallback(
        session=None,
        query="question",
        group_id=None,
        top_k=4,
    )

    assert result.low_confidence is False
    assert result.quality_reason == QUALITY_REASON_OK
    assert result.answer == "answer [1]"
    assert len(result.retrieved) == 1


@pytest.mark.asyncio
async def test_chat_pipeline_handles_empty_retrieval() -> None:
    pipeline = ChatPipeline(
        retrieval=FakeRetrievalEmpty(),
        generator=FakeGenerator(),
        low_confidence_threshold=0.35,
    )
    result = await pipeline._run_fallback(
        session=None,
        query="question",
        group_id=None,
        top_k=4,
    )

    assert result.quality_reason == QUALITY_REASON_NO_RELEVANT_CHUNKS
    assert result.used_chunks == 0
    assert result.retrieved == []
    assert "Не удалось найти релевантные фрагменты" in result.answer
