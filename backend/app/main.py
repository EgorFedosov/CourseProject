from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers, trace_id_middleware
from app.core.logging import configure_logging

settings = get_settings()
configure_logging(settings.app_env)

app = FastAPI(
    title="CourseProject Backend API",
    version="0.1.0",
)

app.middleware("http")(trace_id_middleware)
register_exception_handlers(app)

app.include_router(api_router, prefix=settings.api_v1_prefix)
