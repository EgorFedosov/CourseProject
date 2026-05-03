from dataclasses import dataclass

from app.application.dto.health import ServiceStatus
from app.core.config import Settings


@dataclass(frozen=True, slots=True)
class AiConfigHealthProbe:
    settings: Settings

    def check(self) -> ServiceStatus:
        has_connection_settings = bool(
            self.settings.ai_provider
            and self.settings.ai_api_key
            and self.settings.ai_model
        )

        if has_connection_settings:
            return ServiceStatus.UP

        return ServiceStatus.NOT_CONFIGURED
