from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True, slots=True)
class CorrectionCase:
    case_id: str
    doc_features_json: dict[str, Any]
    predicted_type: str | None
    final_type: str
    predicted_semester: int | None
    final_semester: int
    predicted_violations_json: list[dict[str, Any]]
    final_violations_json: list[dict[str, Any]]
    teacher_comment: str | None
    created_at: datetime
