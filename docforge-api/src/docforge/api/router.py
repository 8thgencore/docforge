from fastapi import APIRouter

from docforge.api.routes.groups import router as groups_router
from docforge.api.routes.ingestions import router as ingestion_router
from docforge.api.routes.query import router as query_router

api_router = APIRouter()
api_router.include_router(groups_router)
api_router.include_router(ingestion_router)
api_router.include_router(query_router)
