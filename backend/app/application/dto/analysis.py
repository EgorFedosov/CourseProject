from __future__ import annotations

from pydantic import BaseModel, Field

from app.domain.value_objects.analysis_status import AnalysisStatus


class StartAnalysisRequestDTO(BaseModel):
    document_id: str = Field(..., min_length=1)
    requested_by: str = Field(..., min_length=1)


class StartAnalysisResponseDTO(BaseModel):
    check_id: str
    status: AnalysisStatus


class AnalysisStatusResponseDTO(BaseModel):
    check_id: str
    status: AnalysisStatus
    progress: int = Field(..., ge=0, le=100)
    error: str | None = None
