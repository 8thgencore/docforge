from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.chat import Citation
from src.schemas.draft import DraftResponse
from src.services.ollama import OllamaClient
from src.services.retrieval import RetrievalService


@dataclass(slots=True)
class DraftService:
    retrieval: RetrievalService
    ollama: OllamaClient

    async def generate_draft(
        self,
        session: AsyncSession,
        group_id,
        category: str,
        prompt: str,
        length: str,
        tone: str,
        format_name: str,
    ) -> DraftResponse:
        retrieved = await self.retrieval.retrieve(
            session=session,
            query=prompt,
            group_id=group_id,
            category=category,
            top_k=12,
        )
        citations = [
            Citation(
                document_id=item.document_id,
                chunk_id=item.chunk_id,
                filename=item.filename,
                category=item.category,
                score=item.score,
            )
            for item in retrieved
        ]

        if not retrieved:
            return DraftResponse(
                title="Черновик",
                sections=[],
                citations=[],
                warnings=["Для выбранной категории не найден контекст."],
            )

        style_examples = "\n\n".join(item.text for item in retrieved[:4])
        prompt_text = (
            f"Сгенерируй черновик документа формата {format_name}.\n"
            f"Категория: {category}.\n"
            f"Тон: {tone}.\n"
            f"Длина: {length}.\n"
            f"Задача: {prompt}.\n\n"
            f"Стиль и фактура источников:\n{style_examples}\n\n"
            "Верни текст с заголовком и разделами."
        )

        generated = await self.ollama.generate(
            prompt=prompt_text,
            system="Ты помощник по подготовке деловых документов.",
        )
        lines = [line.strip() for line in generated.splitlines() if line.strip()]
        title = lines[0].lstrip("# ") if lines else "Черновик"
        sections = lines[1:] if len(lines) > 1 else []

        return DraftResponse(
            title=title,
            sections=sections,
            citations=citations[:8],
            warnings=[],
        )
