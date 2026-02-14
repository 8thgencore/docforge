# Repository Guidelines

## Project Structure & Module Organization
- `src/docforge/` contains application code.
- `src/docforge/api/` hosts FastAPI routing and dependencies.
- `src/docforge/services/` contains business logic (retrieval, parsing, storage, LLM integration).
- `src/docforge/tasks/` contains Taskiq broker, worker entrypoint, and async ingestion tasks.
- `src/docforge/models/`, `src/docforge/schemas/`, `src/docforge/db/` contain SQLAlchemy models, Pydantic schemas, and DB session/base setup.
- `alembic/` and `alembic/versions/` store migration config and revisions.
- `tests/unit/` contains unit tests.
- `docs/` contains operational docs (`docs/DEPLOYMENT.md`, `docs/DEVELOPMENT.md`, `docs/ARCHITECTURE_AND_USAGE.md`).

## Build, Test, and Development Commands
- `uv sync --python 3.13 --all-extras` installs runtime + dev dependencies.
- `uv run alembic upgrade head` applies DB migrations.
- `uv run docforge-api` starts API (FastAPI/Uvicorn).
- `uv run docforge-worker` starts Taskiq worker.
- `docker compose -p docforge-local -f deployments/docker-compose.local.yml up -d` starts local infra only (Postgres/Redis/Qdrant).
- `uv run pytest` runs tests; `uv run pytest --cov=src` runs with coverage.
- `uv run ruff check .` runs lint checks.

## Coding Style & Naming Conventions
- Python 3.13, 4-space indentation, type hints for public functions and service boundaries.
- Follow existing naming: `snake_case` for functions/variables/modules, `PascalCase` for classes, `UPPER_SNAKE_CASE` for constants.
- Keep API handlers thin; move non-trivial logic into `services/`.
- Prefer explicit imports from package modules (e.g., `docforge.services...`).

## Testing Guidelines
- Framework: `pytest` with `pytest-asyncio` (`asyncio_mode=auto`).
- Place tests under `tests/unit/` and name files `test_*.py`.
- Mirror target module behavior in test names (example: `test_chunking.py` for `utils/chunking.py`).
- Add or update tests for every bugfix and behavioral change.

## Commit & Pull Request Guidelines
- Current history is minimal (`Init project`), so use concise imperative commit titles (e.g., `Add ingestion retry backoff`).
- Keep commits focused; avoid mixing schema, API, and infra changes when possible.
- PRs should include:
  - clear summary and motivation,
  - linked issue/task,
  - migration notes (if `alembic/versions/*` changed),
  - test evidence (command + result),
  - API examples or screenshots for endpoint behavior changes.

## Security & Configuration Tips
- Copy `.env.example` to `.env`; never commit secrets.
- Configure via `DB_*`, `REDIS_*`, `QDRANT_*`, `OLLAMA_*` variables; app composes URLs internally.
- For local non-Docker runs, use writable local paths for `STORAGE_PATH` and `UPLOAD_PATH` (e.g., `./data/storage`, `./data/uploads`).
