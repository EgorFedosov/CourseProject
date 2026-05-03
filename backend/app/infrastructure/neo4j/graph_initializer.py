from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from app.core.config import Settings
from app.infrastructure.neo4j.client import Neo4jClient
from app.infrastructure.neo4j.cypher import CypherFileLoader

SCHEMA_FILES: tuple[str, ...] = (
    "schema/constraints.cypher",
    "schema/indexes.cypher",
)

SEED_FILES: tuple[str, ...] = (
    "data/seed_document_types.cypher",
    "data/seed_semesters.cypher",
    "data/seed_requirements.cypher",
)


@dataclass(frozen=True, slots=True)
class Neo4jGraphInitializer:
    client: Neo4jClient
    cypher_loader: CypherFileLoader

    def initialize(self) -> None:
        with self.client.get_session() as session:
            for file_path in (*SCHEMA_FILES, *SEED_FILES):
                statements = self.cypher_loader.load_statements(file_path)
                for statement in statements:
                    session.run(statement).consume()


def get_neo4j_assets_root(settings: Settings) -> Path:
    backend_root = Path(__file__).resolve().parents[3]
    return (backend_root / settings.neo4j_assets_path).resolve()
