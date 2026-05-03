from dataclasses import dataclass

from app.application.dto.health import ServiceStatus
from app.core.config import Settings


@dataclass(frozen=True, slots=True)
class Neo4jConfigHealthProbe:
    settings: Settings

    def check(self) -> ServiceStatus:
        has_connection_settings = bool(
            self.settings.neo4j_uri
            and self.settings.neo4j_user
            and self.settings.neo4j_password
        )

        if has_connection_settings:
            return ServiceStatus.UP

        return ServiceStatus.NOT_CONFIGURED
