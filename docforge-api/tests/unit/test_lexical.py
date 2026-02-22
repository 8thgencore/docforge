from src.utils.lexical import lexical_score, tokenize


def test_tokenize_supports_cyrillic() -> None:
    tokens = tokenize("Привет, мир! Тест_123")
    assert "привет" in tokens
    assert "мир" in tokens
    assert "тест_123" in tokens


def test_lexical_score_non_zero_for_russian_overlap() -> None:
    score = lexical_score(query="отчет по продажам", text="Финальный отчет по продажам за квартал")
    assert score > 0.0
