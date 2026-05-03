from dataclasses import dataclass

from app.application.dto.health import HealthResponseDTO, ServiceStatus
from app.application.ports.health import HealthProbe


@dataclass(frozen=True, slots=True)
class GetHealthStatusUseCase:
    neo4j_probe: HealthProbe
    ai_probe: HealthProbe | None = None

    def execute(self) -> HealthResponseDTO:
        ai_status = self.ai_probe.check() if self.ai_probe else None

        return HealthResponseDTO(
            api_status=ServiceStatus.UP,
            neo4j_status=self.neo4j_probe.check(),
            ai_status=ai_status,
        )
