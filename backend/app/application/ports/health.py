from typing import Protocol

from app.application.dto.health import ServiceStatus


class HealthProbe(Protocol):
    def check(self) -> ServiceStatus: ...
