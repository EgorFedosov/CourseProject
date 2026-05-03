from __future__ import annotations

from dataclasses import dataclass

from neo4j import Driver, GraphDatabase

from app.core.config import Settings
from app.core.errors import AppError


@dataclass(slots=True)
class Neo4jClient:
    settings: Settings
    _driver: Driver | None = None

    def _validate_settings(self) -> None:
        if self.settings.has_neo4j_config:
            return

        raise AppError(
            code="NEO4J_CONFIG_ERROR",
            message=(
                "Neo4j settings are incomplete. "
                "Expected NEO4J_URI, NEO4J_USER and NEO4J_PASSWORD."
            ),
            status_code=500,
        )

    def get_driver(self) -> Driver:
        if self._driver is None:
            self._validate_settings()
            self._driver = GraphDatabase.driver(
                self.settings.neo4j_uri,
                auth=(self.settings.neo4j_user, self.settings.neo4j_password),
            )
        return self._driver

    def get_session(self):  # noqa: ANN201 - neo4j session type is runtime specific
        return self.get_driver().session(database=self.settings.neo4j_database)

    def verify_connectivity(self) -> None:
        self.get_driver().verify_connectivity()

    def close(self) -> None:
        if self._driver is not None:
            self._driver.close()
            self._driver = None
