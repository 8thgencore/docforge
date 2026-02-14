# Разработка

## Структура проекта
- `src/docforge/api/` — роуты FastAPI и зависимости
- `src/docforge/services/` — бизнес-логика (retrieval, parsing, storage, LLM)
- `src/docforge/tasks/` — Taskiq broker/worker и ingestion-задачи
- `src/docforge/models/`, `src/docforge/schemas/`, `src/docforge/db/` — модели, схемы, доступ к БД
- `alembic/` — миграции
- `tests/unit/` — unit-тесты

## Локальный цикл разработки
```bash
docker compose -p docforge-local -f deployments/docker-compose.local.yml up -d
uv sync --python 3.13 --all-extras
uv run alembic upgrade head
```

Запуск сервисов:
```bash
uv run docforge-api
uv run docforge-worker
```

## Команды качества
```bash
uv run pytest
uv run pytest --cov=src
uv run ruff check .
```

## Миграции
Создать ревизию:
```bash
uv run alembic revision --autogenerate -m "описание"
```
Применить:
```bash
uv run alembic upgrade head
```
Откатить на шаг:
```bash
uv run alembic downgrade -1
```

## Практика изменений
- Держите роуты тонкими; переносите логику в `services/`.
- Для изменения схемы БД всегда добавляйте миграцию.
- На каждый bugfix или изменение поведения добавляйте/обновляйте тест.
