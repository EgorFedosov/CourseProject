import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers, trace_id_middleware
from app.core.logging import configure_logging
from app.infrastructure.neo4j.cypher import CypherFileLoader
from app.infrastructure.neo4j.dependencies import get_neo4j_client
from app.infrastructure.neo4j.graph_initializer import (
    Neo4jGraphInitializer,
    get_neo4j_assets_root,
)

settings = get_settings()
configure_logging(settings.app_env)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    neo4j_client = get_neo4j_client()

    if settings.neo4j_init_on_startup and settings.has_neo4j_config:
        assets_root = get_neo4j_assets_root(settings)
        initializer = Neo4jGraphInitializer(
            client=neo4j_client,
            cypher_loader=CypherFileLoader(assets_root=assets_root),
        )
        initializer.initialize()
    elif settings.neo4j_init_on_startup:
        logger.info("Neo4j initialization skipped: configuration is incomplete.")

    try:
        yield
    finally:
        neo4j_client.close()


app = FastAPI(
    title="CourseProject Backend API",
    version="0.1.0",
    lifespan=lifespan,
)

app.middleware("http")(trace_id_middleware)
register_exception_handlers(app)

app.include_router(api_router, prefix=settings.api_v1_prefix)
