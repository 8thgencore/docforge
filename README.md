# DocForge RAG Monorepo

Репозиторий содержит два связанных проекта:

- `docforge-api` — backend-платформа (FastAPI + Taskiq) для загрузки документов, индексации в Qdrant и RAG-эндпоинтов (`search`, `chat`, `draft`).
- `docforge-web` — frontend-приложение (React + Vite + Tailwind) для работы с группами документов, ingestion, поиском, чатом и генерацией черновиков.

## Структура репозитория

```text
.
├── docforge-api/   # API, worker, миграции, тесты backend
└── docforge-web/   # SPA frontend, UI, тесты frontend
```

## Требования

### Для backend (`docforge-api`)
- Python 3.13
- `uv`
- Docker + Docker Compose

### Для frontend (`docforge-web`)
- Node.js 20+
- `pnpm`

## Быстрый старт

### 1. Запуск backend

```bash
cd docforge-api
cp .env.example .env

docker compose -p docforge-local -f deployments/docker-compose.local.yml up -d
uv sync --python 3.13 --all-extras
uv run alembic upgrade head

# терминал 1
uv run docforge-api

# терминал 2
uv run docforge-worker
```

API будет доступен по адресу `http://localhost:8300`, основный префикс — `/v1`.

### 2. Запуск frontend

```bash
cd docforge-web
pnpm install
pnpm dev
```

Frontend будет доступен по адресу `http://localhost:5173` (по умолчанию Vite).

## Настройка frontend для работы с API

1. Откройте страницу `Settings` в web-приложении.
2. Укажите:
- `API base URL` (обычно `http://localhost:8300/v1`)
- `X-API-Key` (значение `API_KEY` из `docforge-api/.env`)
3. Выберите тему оформления и язык интерфейса (RU/EN).

## Что умеет система

### Backend (`docforge-api`)
- Создание и список групп документов
- Загрузка файлов и ZIP-архивов
- Фоновая индексация и отслеживание статуса ingestion
- Семантический поиск по чанкам
- RAG-чат с цитатами
- Генерация черновиков по контексту

### Frontend (`docforge-web`)
- UI для создания групп и просмотра списка
- Upload/ZIP ingestion + polling статуса
- Экран семантического поиска
- Экран RAG-чата
- Экран генерации черновиков
- Страница настроек (API URL, API key, тема, язык)

## Полезные команды

### Backend

```bash
cd docforge-api
uv run pytest
uv run ruff check .
```

### Frontend

```bash
cd docforge-web
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Документация backend

- `docforge-api/README.md`
- `docforge-api/docs/ARCHITECTURE_AND_USAGE.md`
- `docforge-api/docs/DEVELOPMENT.md`
- `docforge-api/docs/DEPLOYMENT.md`
