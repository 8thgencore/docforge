from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import TypedDict
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.application.ports.llm import TextGenerator
from src.application.retrieval import RetrievalService, RetrievedChunk

logger = logging.getLogger(__name__)

QUALITY_REASON_OK = "ok"
QUALITY_REASON_INSUFFICIENT_CONTEXT = "insufficient_context"
QUALITY_REASON_NO_RELEVANT_CHUNKS = "no_relevant_chunks"


class ChatState(TypedDict, total=False):
    query: str
    group_id: UUID | None
    top_k: int
    retrieved: list[RetrievedChunk]
    answer: str
    quality_reason: str
    low_confidence: bool
    best_score: float | None
    used_chunks: int


@dataclass(slots=True)
class ChatPipelineResult:
    answer: str
    retrieved: list[RetrievedChunk]
    quality_reason: str
    low_confidence: bool
    best_score: float | None
    used_chunks: int


@dataclass(slots=True)
class ChatPipeline:
    retrieval: RetrievalService
    generator: TextGenerator
    low_confidence_threshold: float

    async def run(
        self,
        session: AsyncSession,
        query: str,
        group_id: UUID | None,
        top_k: int,
    ) -> ChatPipelineResult:
        try:
            return await self._run_langgraph(session, query, group_id, top_k)
        except Exception:
            logger.exception("langgraph chat flow failed, using fallback")
            return await self._run_fallback(session, query, group_id, top_k)

    async def _run_langgraph(
        self,
        session: AsyncSession,
        query: str,
        group_id: UUID | None,
        top_k: int,
    ) -> ChatPipelineResult:
        from langgraph.graph import END, StateGraph

        async def retrieve_node(state: ChatState) -> ChatState:
            retrieved = await self.retrieval.retrieve(
                session=session,
                query=state["query"],
                group_id=state.get("group_id"),
                top_k=state["top_k"],
            )
            best_score = retrieved[0].score if retrieved else None
            low_confidence = bool(retrieved) and bool(
                best_score is not None and best_score < self.low_confidence_threshold,
            )
            if not retrieved:
                quality_reason = QUALITY_REASON_NO_RELEVANT_CHUNKS
            elif low_confidence:
                quality_reason = QUALITY_REASON_INSUFFICIENT_CONTEXT
            else:
                quality_reason = QUALITY_REASON_OK
            return {
                "retrieved": retrieved,
                "best_score": best_score,
                "low_confidence": low_confidence,
                "quality_reason": quality_reason,
                "used_chunks": len(retrieved),
            }

        async def generate_node(state: ChatState) -> ChatState:
            retrieved = state.get("retrieved", [])
            quality_reason = str(state.get("quality_reason", QUALITY_REASON_OK))
            if not retrieved:
                return {
                    "answer": (
                        "Не удалось найти релевантные фрагменты в базе знаний по этому запросу. "
                        "Уточните формулировку вопроса или выберите другую группу документов."
                    ),
                }

            answer = await self._generate_answer(
                query=state["query"],
                retrieved=retrieved,
                quality_reason=quality_reason,
            )
            return {"answer": answer}

        workflow = StateGraph(ChatState)
        workflow.add_node("retrieve", retrieve_node)
        workflow.add_node("generate", generate_node)
        workflow.set_entry_point("retrieve")
        workflow.add_edge("retrieve", "generate")
        workflow.add_edge("generate", END)

        graph = workflow.compile()
        result: ChatState = await graph.ainvoke(
            {
                "query": query,
                "group_id": group_id,
                "top_k": top_k,
            },
        )

        return ChatPipelineResult(
            answer=str(result.get("answer", "")),
            retrieved=list(result.get("retrieved", [])),
            quality_reason=str(result.get("quality_reason", QUALITY_REASON_OK)),
            low_confidence=bool(result.get("low_confidence", False)),
            best_score=float(result["best_score"]) if result.get("best_score") is not None else None,
            used_chunks=int(result.get("used_chunks", 0)),
        )

    async def _run_fallback(
        self,
        session: AsyncSession,
        query: str,
        group_id: UUID | None,
        top_k: int,
    ) -> ChatPipelineResult:
        retrieved = await self.retrieval.retrieve(
            session=session,
            query=query,
            group_id=group_id,
            top_k=top_k,
        )
        best_score = retrieved[0].score if retrieved else None
        low_confidence = bool(retrieved) and bool(
            best_score is not None and best_score < self.low_confidence_threshold,
        )

        if not retrieved:
            return ChatPipelineResult(
                answer=(
                    "Не удалось найти релевантные фрагменты в базе знаний по этому запросу. "
                    "Уточните формулировку вопроса или выберите другую группу документов."
                ),
                retrieved=[],
                quality_reason=QUALITY_REASON_NO_RELEVANT_CHUNKS,
                low_confidence=False,
                best_score=None,
                used_chunks=0,
            )

        quality_reason = QUALITY_REASON_INSUFFICIENT_CONTEXT if low_confidence else QUALITY_REASON_OK
        answer = await self._generate_answer(query=query, retrieved=retrieved, quality_reason=quality_reason)
        return ChatPipelineResult(
            answer=answer,
            retrieved=retrieved,
            quality_reason=quality_reason,
            low_confidence=low_confidence,
            best_score=best_score,
            used_chunks=len(retrieved),
        )

    async def _generate_answer(self, query: str, retrieved: list[RetrievedChunk], quality_reason: str) -> str:
        context_blocks = [f"[{index}] {item.text}" for index, item in enumerate(retrieved, start=1)]
        quality_note = ""
        if quality_reason == QUALITY_REASON_INSUFFICIENT_CONTEXT:
            quality_note = (
                "Контекст ограничен: ответь максимально полезно, но явно укажи, где уверенность низкая. "
                "Ссылки [n] обязательны для всех утверждений.\n"
            )

        prompt = (
            "Ответь на вопрос пользователя, опираясь только на контекст. "
            "После каждого фактического утверждения добавляй ссылку вида [n]. "
            "Используй только номера, которые есть в контексте. "
            "Если данных недостаточно, прямо укажи ограничения.\n"
            f"{quality_note}\n"
            f"Вопрос: {query}\n\n"
            f"Контекст:\n{'\n\n'.join(context_blocks)}"
        )
        return await self.generator.generate(
            prompt=prompt,
            system="Ты RAG-ассистент, который всегда указывает источники в формате [n].",
        )
