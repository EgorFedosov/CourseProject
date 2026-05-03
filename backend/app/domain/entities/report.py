from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True, slots=True)
class Report:
    report_id: str
    overall_status: str
    summary: str
    generated_at: datetime
    path: str
