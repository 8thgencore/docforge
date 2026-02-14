# =============================================================================
# Dependencies stage with common setup
# =============================================================================
FROM python:3.13.12-slim AS deps

ENV WORKDIR=/usr/src/app
WORKDIR ${WORKDIR}

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    VIRTUAL_ENV=${WORKDIR}/.venv \
    PATH="${WORKDIR}/.venv/bin:$PATH"

RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.10.2 /uv /bin/
COPY pyproject.toml uv.lock ./

RUN uv venv && \
    uv sync --frozen --no-install-project --no-dev

# =============================================================================
# Runtime environment
# =============================================================================
FROM python:3.13.12-slim AS runtime

ENV WORKDIR=/usr/src/app
WORKDIR ${WORKDIR}

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    VIRTUAL_ENV=${WORKDIR}/.venv \
    PATH="${WORKDIR}/.venv/bin:$PATH"

RUN apt-get update && apt-get install -y --no-install-recommends \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps ${WORKDIR}/.venv .venv/
COPY . .


RUN mkdir -p ${WORKDIR}/data/storage ${WORKDIR}/data/uploads

CMD ["docforge-api"]
