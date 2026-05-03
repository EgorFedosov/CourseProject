from typing import Any

from pydantic import BaseModel, Field


class ErrorResponseDTO(BaseModel):
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error description")
    details: Any | None = Field(default=None, description="Optional details")
    trace_id: str = Field(..., description="Request trace identifier")
