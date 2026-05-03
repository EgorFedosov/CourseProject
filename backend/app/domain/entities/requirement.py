from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class Requirement:
    code: str
    title: str
    category: str
    severity: str
    condition_json: dict[str, Any]
    message_template: str
    recommendation: str
    version: str
    is_active: bool
