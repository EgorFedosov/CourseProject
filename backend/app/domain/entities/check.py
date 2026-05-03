from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True, slots=True)
class Check:
    check_id: str
    started_at: datetime
    status: str
    finished_at: datetime | None = None
