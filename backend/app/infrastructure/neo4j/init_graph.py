from app.core.config import get_settings
from app.infrastructure.neo4j.client import Neo4jClient
from app.infrastructure.neo4j.cypher import CypherFileLoader
from app.infrastructure.neo4j.graph_initializer import (
    Neo4jGraphInitializer,
    get_neo4j_assets_root,
)


def run_graph_initialization() -> None:
    settings = get_settings()
    client = Neo4jClient(settings=settings)
    initializer = Neo4jGraphInitializer(
        client=client,
        cypher_loader=CypherFileLoader(assets_root=get_neo4j_assets_root(settings)),
    )

    try:
        initializer.initialize()
    finally:
        client.close()


if __name__ == "__main__":
    run_graph_initialization()
