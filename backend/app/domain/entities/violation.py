from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class Violation:
    violation_id: str
    code: str
    message: str
    severity: str
    evidence_json: dict[str, Any] | None = None
    confidence: float | None = None
