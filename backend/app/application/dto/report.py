from __future__ import annotations

from pydantic import BaseModel, Field


class AppliedRuleDTO(BaseModel):
    code: str = Field(..., min_length=1)
    title: str | None = None
    category: str | None = None
    severity: str | None = None


class ReportViolationDTO(BaseModel):
    violation_id: str
    code: str
    message: str
    severity: str
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    evidence: dict[str, object] | None = None


class ReportResponseDTO(BaseModel):
    check_id: str
    overall_status: str
    determined_type: str
    determined_semester: int = Field(..., ge=1, le=12)
    applied_rules: list[AppliedRuleDTO]
    violations: list[ReportViolationDTO]
    recommendations: list[str]
    summary: str | None = None

    # Backward-compatible fields for clients that still use legacy names.
    type: str | None = None
    semester: int | None = Field(default=None, ge=1, le=12)
    rules: list[str] = Field(default_factory=list)
