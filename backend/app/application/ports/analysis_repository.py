from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Protocol

from app.domain.entities.violation import Violation
from app.domain.value_objects.analysis_status import AnalysisStatus


@dataclass(frozen=True, slots=True)
class AnalysisStatusSnapshot:
    check_id: str
    status: AnalysisStatus
    progress: int
    error: str | None


@dataclass(frozen=True, slots=True)
class ReportSnapshot:
    check_id: str
    report_id: str
    document_type: str
    semester: int
    rules: list[str]
    violations: list[Violation]
    recommendations: list[str]
    overall_status: str


class AnalysisRepository(Protocol):
    def find_active_check_for_document(self, *, document_id: str) -> str | None:
        ...

    def create_check(
        self,
        *,
        check_id: str,
        document_id: str,
        requested_by: str,
        started_at: datetime,
        status: AnalysisStatus,
        progress: int,
    ) -> None:
        ...

    def update_check_status(
        self,
        *,
        check_id: str,
        status: AnalysisStatus,
        progress: int,
        error: str | None = None,
        document_type: str | None = None,
        semester: int | None = None,
        finished_at: datetime | None = None,
    ) -> None:
        ...

    def save_used_rule_codes(self, *, check_id: str, rule_codes: Sequence[str]) -> None:
        ...

    def save_report(self, *, report: ReportSnapshot) -> None:
        ...

    def get_status(self, *, check_id: str) -> AnalysisStatusSnapshot | None:
        ...

    def get_report(self, *, check_id: str) -> ReportSnapshot | None:
        ...
