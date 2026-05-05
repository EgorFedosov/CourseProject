from __future__ import annotations

from dataclasses import dataclass

from pydantic import BaseModel, Field

from app.application.ports.ai_assistant import AiSuggestion


class AiResponsePayload(BaseModel):
    predicted_type: str = Field(..., min_length=1)
    type_confidence: float = Field(..., ge=0.0, le=1.0)
    predicted_semester: int = Field(..., ge=1, le=12)
    semester_confidence: float = Field(..., ge=0.0, le=1.0)
    explanations: list[str] = Field(default_factory=list)
    risk_flags: list[str] = Field(default_factory=list)


@dataclass(frozen=True, slots=True)
class StrictAiResponseParser:
    def parse(self, *, raw_text: str) -> AiSuggestion:
        payload = AiResponsePayload.model_validate_json(raw_text)
        return AiSuggestion(
            predicted_type=payload.predicted_type,
            type_confidence=payload.type_confidence,
            predicted_semester=payload.predicted_semester,
            semester_confidence=payload.semester_confidence,
            explanations=payload.explanations,
            risk_flags=payload.risk_flags,
        )
