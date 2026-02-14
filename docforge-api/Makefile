UV ?= uv
UV_CACHE_DIR ?= ./.uv-cache
UV_RUN = UV_CACHE_DIR=$(UV_CACHE_DIR) $(UV) run
UV_SYNC = UV_CACHE_DIR=$(UV_CACHE_DIR) $(UV) sync

STACK_LOCAL ?= docforge-local
STACK_DEV ?= docforge-dev
STACK_PROD ?= docforge-prod

COMPOSE_LOCAL = docker compose -p $(STACK_LOCAL) -f deployments/docker-compose.local.yml
COMPOSE_DEV = docker compose -p $(STACK_DEV) -f deployments/docker-compose.dev.yml
COMPOSE_PROD = docker compose -p $(STACK_PROD) -f deployments/docker-compose.prod.yml

.PHONY: help sync migrate run-api run-worker test lint docker-local-up docker-local-down docker-local-logs docker-dev-up docker-dev-down docker-prod-up docker-prod-down

help:
	@echo "Основные команды:"
	@echo "  make sync       - установить зависимости"
	@echo "  make migrate    - применить миграции"
	@echo "  make run-api    - запустить API"
	@echo "  make run-worker - запустить worker"
	@echo "  make test       - запустить тесты"
	@echo "  make lint       - запустить линтер"
	@echo "  make docker-local-up   - поднять локальную инфраструктуру"
	@echo "  make docker-local-down - остановить локальную инфраструктуру"
	@echo "  make docker-dev-up     - поднять dev-стек в Docker"
	@echo "  make docker-dev-down   - остановить dev-стек"
	@echo "  make docker-prod-up    - поднять prod-стек в Docker"
	@echo "  make docker-prod-down  - остановить prod-стек"

sync:
	$(UV_SYNC) --python 3.13 --all-extras

migrate:
	$(UV_RUN) alembic upgrade head

run-api:
	$(UV_RUN) python -c "from src.main import run; run()"

run-worker:
	$(UV_RUN) python -c "from src.tasks.worker import run_worker; run_worker()"

test:
	$(UV_RUN) pytest

lint:
	$(UV_RUN) ruff check .

docker-local-up:
	$(COMPOSE_LOCAL) up -d

docker-local-down:
	$(COMPOSE_LOCAL) down

docker-local-logs:
	$(COMPOSE_LOCAL) logs -f

docker-dev-up:
	$(COMPOSE_DEV) up -d --build

docker-dev-down:
	$(COMPOSE_DEV) down

docker-prod-up:
	$(COMPOSE_PROD) up -d --build

docker-prod-down:
	$(COMPOSE_PROD) down
