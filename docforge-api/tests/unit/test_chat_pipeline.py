import uuid

import pytest

from src.schemas.chat import Citation
from src.services.langgraph_chat import ChatPipeline, build_citations
from src.services.retrieval import RetrievedChunk


class FakeRetrievalLow:
    async def retrieve(self, session, query, group_id, tag, top_k):
        return [
            RetrievedChunk(
                chunk_id=uuid.uuid4(),
                document_id=uuid.uuid4(),
                filename="a.txt",
                tag="reports",
                text="short context",
                score=0.1,
            ),
        ]


class FakeRetrievalHigh:
    async def retrieve(self, session, query, group_id, tag, top_k):
        return [
            RetrievedChunk(
                chunk_id=uuid.uuid4(),
                document_id=uuid.uuid4(),
                filename="a.txt",
                tag="reports",
                text="relevant context",
                score=0.9,
            ),
        ]


class FakeOllama:
    async def generate(self, prompt: str, system: str | None = None) -> str:
        return "answer"


@pytest.mark.asyncio
async def test_chat_pipeline_marks_insufficient_context_for_low_score() -> None:
    pipeline = ChatPipeline(retrieval=FakeRetrievalLow(), generator=FakeOllama(), low_confidence_threshold=0.35)

    answer, citations, insufficient = await pipeline._run_fallback(
        session=None,
        query="question",
        group_id=None,
        tag=None,
        top_k=4,
    )

    assert insufficient is True
    assert len(citations) == 1
    assert "Недостаточно" in answer


@pytest.mark.asyncio
async def test_chat_pipeline_generates_when_confident() -> None:
    pipeline = ChatPipeline(
        retrieval=FakeRetrievalHigh(),
        generator=FakeOllama(),
        low_confidence_threshold=0.35,
    )

    answer, citations, insufficient = await pipeline._run_fallback(
        session=None,
        query="question",
        group_id=None,
        tag=None,
        top_k=4,
    )

    assert insufficient is False
    assert answer == "answer"
    assert len(citations) == 1


def test_build_citations_maps_retrieved_chunks() -> None:
    chunk = RetrievedChunk(
        chunk_id=uuid.uuid4(),
        document_id=uuid.uuid4(),
        filename="x.txt",
        tag=None,
        text="ctx",
        score=0.5,
    )
    citations = build_citations([chunk])

    assert len(citations) == 1
    assert isinstance(citations[0], Citation)
    assert citations[0].filename == "x.txt"
