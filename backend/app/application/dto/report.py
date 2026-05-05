from __future__ import annotations

from pydantic import BaseModel, Field


class ReportViolationDTO(BaseModel):
    violation_id: str
    code: str
    message: str
    severity: str
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    evidence: dict[str, object] | None = None


class ReportResponseDTO(BaseModel):
    check_id: str
    type: str
    semester: int = Field(..., ge=1, le=12)
    rules: list[str]
    violations: list[ReportViolationDTO]
    recommendations: list[str]
    overall_status: str
