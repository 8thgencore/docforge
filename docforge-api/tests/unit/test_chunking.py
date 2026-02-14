import pytest

from src.utils.chunking import chunk_text


def test_chunk_text_respects_max_chars() -> None:
    text = " ".join([f"token{i}" for i in range(200)])
    chunks = chunk_text(text=text, max_chars=120, overlap=20)

    assert len(chunks) > 1
    assert all(len(chunk) <= 120 for chunk in chunks)
    assert chunks[0].startswith("token0")


def test_chunk_text_rejects_invalid_window() -> None:
    with pytest.raises(ValueError):
        chunk_text("abc", max_chars=100, overlap=100)
