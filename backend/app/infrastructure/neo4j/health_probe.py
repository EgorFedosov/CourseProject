from dataclasses import dataclass

from app.application.dto.health import ServiceStatus
from app.infrastructure.neo4j.client import Neo4jClient


@dataclass(frozen=True, slots=True)
class Neo4jHealthProbe:
    client: Neo4jClient

    def check(self) -> ServiceStatus:
        if not self.client.settings.has_neo4j_config:
            return ServiceStatus.NOT_CONFIGURED

        try:
            self.client.verify_connectivity()
        except Exception:
            return ServiceStatus.DOWN

        return ServiceStatus.UP
