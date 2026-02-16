# DocForge RAG

DocForge RAG — backend-платформа для загрузки документов, индексации в векторное хранилище и ответов на вопросы с опорой на найденные фрагменты.

## Как это работает
1. Вы создаёте группу документов.
2. Загружаете файлы или ZIP в ingestion-эндпоинт.
3. Worker разбирает файлы, режет на чанки, строит эмбеддинги и индексирует в Qdrant.
4. Через `/search`, `/chat` и `/drafts/generate` получаете поиск, ответы и черновики на основе базы знаний.

## Быстрый старт
```bash
cp .env.example .env
docker compose -p docforge-local -f deployments/docker-compose.local.yml up -d
uv sync --python 3.13 --all-extras
uv run alembic upgrade head
uv run docforge-api
# в другом терминале
uv run docforge-worker
```

По умолчанию API защищён заголовком `X-API-Key` (значение из `API_KEY` в `.env`).

## LLM-провайдеры
Можно использовать:
- `OLLAMA` (по умолчанию): `LLM_PROVIDER=ollama`
- `ChatGPT/OpenAI`: `LLM_PROVIDER=openai` и `OPENAI_API_KEY=<key>`

Для OpenAI можно переопределить:
- `OPENAI_CHAT_MODEL` (по умолчанию `gpt-4o-mini`)
- `OPENAI_EMBED_MODEL` (по умолчанию `text-embedding-3-small`)

## Документация
- Развертывание: `docs/DEPLOYMENT.md`
- Разработка: `docs/DEVELOPMENT.md`
- Устройство и использование: `docs/ARCHITECTURE_AND_USAGE.md`
