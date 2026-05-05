from fastapi import APIRouter

from app.api.v1.routes.analyses import router as analyses_router
from app.api.v1.routes.documents import router as documents_router
from app.api.v1.routes.feedback import router as feedback_router
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.reports import router as reports_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(documents_router)
api_router.include_router(analyses_router)
api_router.include_router(reports_router)
api_router.include_router(feedback_router)
