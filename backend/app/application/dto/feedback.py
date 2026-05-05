from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class FeedbackCorrectionsRequestDTO(BaseModel):
    check_id: str = Field(..., min_length=1)
    final_type: str = Field(..., min_length=1)
    final_semester: int = Field(..., ge=1, le=12)
    confirmed_violations: list[str] = Field(default_factory=list)
    rejected_violations: list[str] = Field(default_factory=list)
    teacher_comment: str | None = None


class AiSuggestionDTO(BaseModel):
    predicted_type: str
    type_confidence: float = Field(..., ge=0.0, le=1.0)
    predicted_semester: int = Field(..., ge=1, le=12)
    semester_confidence: float = Field(..., ge=0.0, le=1.0)
    explanations: list[str]
    risk_flags: list[str]


class FeedbackCorrectionsResponseDTO(BaseModel):
    case_id: str
    check_id: str
    status: Literal["SAVED"]
    ai_mode: Literal["ADAPTED", "RULE_ONLY"]
    ai_suggestion: AiSuggestionDTO | None = None
