from contextlib import asynccontextmanager

import uvicorn
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.deps import require_api_key
from src.api.router import api_router
from src.core.config import get_settings
from src.core.logging import configure_logging

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.storage_path.mkdir(parents=True, exist_ok=True)
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
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
    uvicorn.run("main:app", host="0.0.0.0", port=8300, reload=False)
