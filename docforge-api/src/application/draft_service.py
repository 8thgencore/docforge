from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas.chat import Citation
from src.api.schemas.draft import DraftResponse
from src.application.ports.llm import TextGenerator
from src.application.retrieval import RetrievalService


@dataclass(slots=True)
class DraftService:
    retrieval: RetrievalService
    generator: TextGenerator

    async def generate_draft(
        self,
        session: AsyncSession,
        group_id,
        prompt: str,
        length: str,
        tone: str,
        format_name: str,
    ) -> DraftResponse:
        retrieved = await self.retrieval.retrieve(
            session=session,
            query=prompt,
            group_id=group_id,
            top_k=12,
        )
        citations = [
            Citation(
                document_id=item.document_id,
                chunk_id=item.chunk_id,
                filename=item.filename,
                score=item.score,
            )
            for item in retrieved
        ]

        if not retrieved:
            return DraftResponse(
                title="Черновик",
                sections=[],
                citations=[],
                warnings=["Не найден подходящий контекст в выбранной группе."],
            )

        style_examples = "\n\n".join(item.text for item in retrieved[:4])
        prompt_text = (
            f"Сгенерируй черновик документа формата {format_name}.\n"
            f"Тон: {tone}.\n"
            f"Длина: {length}.\n"
            f"Задача: {prompt}.\n\n"
            f"Стиль и фактура источников:\n{style_examples}\n\n"
            "Верни текст с заголовком и разделами."
        )

        generated = await self.generator.generate(
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
