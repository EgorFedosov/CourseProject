from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from app.domain.entities.correction_case import CorrectionCase


@dataclass(frozen=True, slots=True)
class AiSuggestion:
    predicted_type: str
    type_confidence: float
    predicted_semester: int
    semester_confidence: float
    explanations: list[str]
    risk_flags: list[str]


class AiAssistant(Protocol):
    def suggest(
        self,
        *,
        doc_features: dict[str, object],
        similar_cases: list[CorrectionCase],
    ) -> AiSuggestion | None: ...
