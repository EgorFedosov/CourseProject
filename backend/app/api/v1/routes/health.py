from fastapi import APIRouter, Depends

from app.application.dto.health import HealthResponseDTO
from app.application.use_cases.get_health_status import GetHealthStatusUseCase
from app.core.config import Settings, get_settings
from app.infrastructure.ai.health_probe import AiConfigHealthProbe
from app.infrastructure.neo4j.dependencies import get_neo4j_client
from app.infrastructure.neo4j.health_probe import Neo4jHealthProbe

router = APIRouter(tags=["health"])


def _has_any_ai_config(settings: Settings) -> bool:
    return any((settings.ai_provider, settings.ai_api_key, settings.ai_model))


def get_health_use_case(settings: Settings = Depends(get_settings)) -> GetHealthStatusUseCase:
    ai_probe = AiConfigHealthProbe(settings=settings) if _has_any_ai_config(settings) else None

    return GetHealthStatusUseCase(
        neo4j_probe=Neo4jHealthProbe(client=get_neo4j_client()),
        ai_probe=ai_probe,
    )


@router.get("/health", response_model=HealthResponseDTO, summary="Service health")
def get_health(
    use_case: GetHealthStatusUseCase = Depends(get_health_use_case),
) -> HealthResponseDTO:
    return use_case.execute()
