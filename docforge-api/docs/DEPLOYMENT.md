# Развертывание DocForge RAG

## Требования
- Docker и Docker Compose
- `uv` и Python 3.13 (если API/worker запускаются не в контейнере)

## Переменные окружения
1. Создайте файл:
```bash
cp .env.example .env
```
2. Заполните минимум:
- `API_KEY`
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `REDIS_PASSWORD`
- `OLLAMA_*` (если используете Ollama)
- `LMSTUDIO_*` (если используете LM Studio)
- `OPENAI_*` (если используете OpenAI)

Приложение само собирает URL из `DB_*`, `REDIS_*`, `QDRANT_*`.

## Вариант 1: production (всё в контейнерах)
```bash
docker compose -p docforge-prod -f deployments/docker-compose.prod.yml up -d --build
docker compose -p docforge-prod -f deployments/docker-compose.prod.yml ps
```
Остановка:
```bash
docker compose -p docforge-prod -f deployments/docker-compose.prod.yml down
```

## Вариант 2: dev в контейнерах
```bash
docker compose -p docforge-dev -f deployments/docker-compose.dev.yml up -d --build
docker compose -p docforge-dev -f deployments/docker-compose.dev.yml logs -f api
```
Остановка:
```bash
docker compose -p docforge-dev -f deployments/docker-compose.dev.yml down
```

## Вариант 3: локально (инфраструктура в Docker, API/worker в консоли)
```bash
docker compose -p docforge-local -f deployments/docker-compose.local.yml up -d
uv sync --python 3.13 --all-extras
uv run alembic upgrade head
uv run docforge-api
uv run docforge-worker
```

Если запускаете API локально, задайте локальные пути хранения:
```bash
uv run docforge-api
```

## Проверка работоспособности
- Swagger UI: `/docs`
- Healthcheck: `GET /v1/health` с заголовком `X-API-Key`
