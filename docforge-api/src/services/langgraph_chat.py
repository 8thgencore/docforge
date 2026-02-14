from __future__ import annotations

from dataclasses import dataclass
from typing import TypedDict
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.chat import Citation
from src.services.ollama import OllamaClient
from src.services.retrieval import RetrievalService


class ChatState(TypedDict, total=False):
    query: str
    group_id: UUID | None
    tag: str | None
    top_k: int
    retrieved: list
    answer: str
    citations: list[Citation]
    insufficient_context: bool


@dataclass(slots=True)
class ChatPipeline:
    retrieval: RetrievalService
    ollama: OllamaClient
    low_confidence_threshold: float

    async def run(
        self,
        session: AsyncSession,
        query: str,
        group_id: UUID | None,
        tag: str | None,
        top_k: int,
    ) -> tuple[str, list[Citation], bool]:
        try:
            return await self._run_langgraph(session, query, group_id, tag, top_k)
        except Exception:
            return await self._run_fallback(session, query, group_id, tag, top_k)

    async def _run_langgraph(
        self,
        session: AsyncSession,
        query: str,
        group_id: UUID | None,
        tag: str | None,
        top_k: int,
    ) -> tuple[str, list[Citation], bool]:
        from langgraph.graph import END, StateGraph

        async def retrieve_node(state: ChatState) -> ChatState:
            retrieved = await self.retrieval.retrieve(
                session=session,
                query=state["query"],
                group_id=state.get("group_id"),
                tag=state.get("tag"),
                top_k=state["top_k"],
            )
            return {"retrieved": retrieved}

        async def generate_node(state: ChatState) -> ChatState:
            retrieved = state.get("retrieved", [])
            if not retrieved:
                return {
                    "answer": "Недостаточно контекста в базе знаний для ответа.",
                    "insufficient_context": True,
                }
            best_score = retrieved[0].score
            if best_score < self.low_confidence_threshold:
                return {
                    "answer": "Недостаточно подтвержденного контекста. Уточните запрос или расширьте набор документов.",
                    "insufficient_context": True,
                }

            context_blocks = [f"[{item.chunk_id}] {item.text}" for item in retrieved]
            prompt = (
                "Ответь на вопрос пользователя, опираясь только на контекст. "
                "Если факта нет в контексте - прямо скажи об этом.\n\n"
                f"Вопрос: {state['query']}\n\n"
                f"Контекст:\n{'\n\n'.join(context_blocks)}"
            )
            answer = await self.ollama.generate(
                prompt=prompt,
                system="Ты RAG-ассистент, давай точные ответы по источникам.",
            )
            return {"answer": answer, "insufficient_context": False}

        def citation_node(state: ChatState) -> ChatState:
            citations = build_citations(state.get("retrieved", []))
            return {"citations": citations}

        workflow = StateGraph(ChatState)
        workflow.add_node("retrieve", retrieve_node)
        workflow.add_node("generate", generate_node)
        workflow.add_node("citations", citation_node)
        workflow.set_entry_point("retrieve")
        workflow.add_edge("retrieve", "generate")
        workflow.add_edge("generate", "citations")
        workflow.add_edge("citations", END)

        graph = workflow.compile()
        result: ChatState = await graph.ainvoke(
            {
                "query": query,
                "group_id": group_id,
                "tag": tag,
                "top_k": top_k,
            },
        )

        return (
            str(result.get("answer", "")),
            list(result.get("citations", [])),
            bool(result.get("insufficient_context", False)),
        )

    async def _run_fallback(
        self,
        session: AsyncSession,
        query: str,
        group_id: UUID | None,
        tag: str | None,
        top_k: int,
    ) -> tuple[str, list[Citation], bool]:
        retrieved = await self.retrieval.retrieve(
            session=session,
            query=query,
            group_id=group_id,
            tag=tag,
            top_k=top_k,
        )
        citations = build_citations(retrieved)

        if not retrieved or retrieved[0].score < self.low_confidence_threshold:
            return (
                "Недостаточно подтвержденного контекста. Уточните запрос или расширьте базу документов.",
                citations,
                True,
            )

        context = "\n\n".join([f"[{item.chunk_id}] {item.text}" for item in retrieved])
        answer = await self.ollama.generate(
            prompt=(f"Ответь на вопрос пользователя строго по контексту.\nВопрос: {query}\n\nКонтекст:\n{context}"),
            system="Ты RAG-ассистент, опирающийся на источники.",
        )
        return answer, citations, False


def build_citations(retrieved: list) -> list[Citation]:
    return [
        Citation(
            document_id=item.document_id,
            chunk_id=item.chunk_id,
            filename=item.filename,
            tag=item.tag,
            score=item.score,
        )
        for item in retrieved
    ]
