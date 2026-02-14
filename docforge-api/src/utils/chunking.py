from __future__ import annotations

from collections.abc import Iterator


def chunk_text(text: str, max_chars: int, overlap: int) -> list[str]:
    cleaned = " ".join(text.split())
    if not cleaned:
        return []
    if max_chars <= overlap:
        raise ValueError("max_chars must be greater than overlap")

    chunks: list[str] = []
    start = 0
    length = len(cleaned)

    while start < length:
        end = min(start + max_chars, length)
        if end < length:
            split = cleaned.rfind(" ", start, end)
            if split > start + max_chars // 3:
                end = split
        chunk = cleaned[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= length:
            break
        start = max(0, end - overlap)

    return chunks


def iter_chunks(text: str, max_chars: int, overlap: int) -> Iterator[tuple[int, str]]:
    yield from enumerate(chunk_text(text, max_chars=max_chars, overlap=overlap))
