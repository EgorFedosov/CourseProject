from functools import lru_cache

from app.core.config import get_settings
from app.infrastructure.neo4j.client import Neo4jClient


@lru_cache
def get_neo4j_client() -> Neo4jClient:
    return Neo4jClient(settings=get_settings())
