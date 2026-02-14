from contextlib import asynccontextmanager

import uvicorn
from fastapi import Depends, FastAPI

from docforge.api.deps import require_api_key
from docforge.api.router import api_router
from docforge.core.config import get_settings
from docforge.core.logging import configure_logging

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.storage_path.mkdir(parents=True, exist_ok=True)
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.include_router(
    api_router,
    prefix=settings.api_v1_prefix,
    dependencies=[Depends(require_api_key)],
)


@app.get("/")
async def root() -> dict:
    return {"name": settings.app_name, "docs": "/docs"}


def run() -> None:
    configure_logging()
    uvicorn.run("docforge.main:app", host="0.0.0.0", port=8300, reload=False)
