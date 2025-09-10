from fastapi import APIRouter
from .endpoints import filters_router, saldos_router

api_router = APIRouter()

# Registra os routers dos endpoints
api_router.include_router(filters_router)
api_router.include_router(saldos_router)

__all__ = ["api_router"]