from collections.abc import Mapping
from typing import Protocol

from app.domain.entities.check import Check
from app.domain.entities.report import Report
from app.domain.entities.violation import Violation


class CheckWriteRepository(Protocol):
    def save_check(
        self,
        *,
        check: Check,
        document_id: str,
        used_requirement_codes: list[str],
    ) -> None:
        ...

    def save_violations(
        self,
        *,
        check_id: str,
        violations: list[Violation],
        violation_requirement_map: Mapping[str, str],
    ) -> None:
        ...

    def save_report(self, *, report: Report, check_id: str) -> None:
        ...
