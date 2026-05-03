from enum import Enum

from pydantic import BaseModel, Field


class ServiceStatus(str, Enum):
    UP = "up"
    DOWN = "down"
    NOT_CONFIGURED = "not_configured"


class HealthResponseDTO(BaseModel):
    api_status: ServiceStatus = Field(..., description="API service availability")
    neo4j_status: ServiceStatus = Field(..., description="Neo4j availability")
    ai_status: ServiceStatus | None = Field(
        default=None,
        description="AI provider availability",
    )
