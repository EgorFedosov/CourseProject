from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import datetime

import pytest

from app.application.dto.analysis import StartAnalysisRequestDTO
from app.application.ports.analysis_pipeline import (
    AnalysisPipeline,
    BuiltReport,
    ParsedDocument,
)
from app.application.ports.analysis_repository import (
    AnalysisRepository,
    AnalysisStatusSnapshot,
    ReportSnapshot,
)
from app.application.use_cases.start_analysis import StartAnalysisUseCase
from app.core.errors import AppError
from app.domain.entities.requirement import Requirement
from app.domain.entities.violation import Violation
from app.domain.value_objects.analysis_status import AnalysisStatus, progress_for_status


@dataclass
class _InMemoryAnalysisRepository(AnalysisRepository):
    active_checks_by_document: dict[str, str] = field(default_factory=dict)
    status_by_check: dict[str, AnalysisStatusSnapshot] = field(default_factory=dict)
    status_updates: list[AnalysisStatus] = field(default_factory=list)
    report_by_check: dict[str, ReportSnapshot] = field(default_factory=dict)
    used_rules_by_check: dict[str, list[str]] = field(default_factory=dict)

    def find_active_check_for_document(self, *, document_id: str) -> str | None:
        return self.active_checks_by_document.get(document_id)

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
        _ = requested_by
        _ = started_at
        self.active_checks_by_document[document_id] = check_id
        self.status_by_check[check_id] = AnalysisStatusSnapshot(
            check_id=check_id,
            status=status,
            progress=progress,
            error=None,
        )

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
        _ = document_type
        _ = semester
        _ = finished_at
        self.status_updates.append(status)
        self.status_by_check[check_id] = AnalysisStatusSnapshot(
            check_id=check_id,
            status=status,
            progress=progress,
            error=error,
        )

    def save_used_rule_codes(self, *, check_id: str, rule_codes: Sequence[str]) -> None:
        self.used_rules_by_check[check_id] = list(rule_codes)

    def save_report(self, *, report: ReportSnapshot) -> None:
        self.report_by_check[report.check_id] = report

    def get_status(self, *, check_id: str) -> AnalysisStatusSnapshot | None:
        return self.status_by_check.get(check_id)

    def get_report(self, *, check_id: str) -> ReportSnapshot | None:
        return self.report_by_check.get(check_id)


@dataclass
class _StablePipeline(AnalysisPipeline):
    fail_on_semester: bool = False

    def parse(self, *, document_id: str) -> ParsedDocument:
        return ParsedDocument(document_id=document_id, raw_text="raw")

    def detect_document_type(self, *, parsed_document: ParsedDocument) -> str:
        _ = parsed_document
        return "COURSE_PROJECT_NOTE"

    def detect_semester(
        self, *, parsed_document: ParsedDocument, document_type: str
    ) -> int:
        _ = parsed_document
        _ = document_type
        if self.fail_on_semester:
            raise RuntimeError("semester detection failed")
        return 4

    def select_rules(self, *, document_type: str, semester: int) -> list[Requirement]:
        _ = document_type
        _ = semester
        return [
            Requirement(
                code="REQ-INTRO-001",
                title="Intro required",
                category="structure",
                severity="high",
                condition_json={"type": "required_section"},
                message_template="msg",
                recommendation="Add intro",
                version="1.0.0",
                is_active=True,
            )
        ]

    def check_requirements(
        self,
        *,
        parsed_document: ParsedDocument,
        requirements: list[Requirement],
    ) -> list[Violation]:
        _ = parsed_document
        _ = requirements
        return []

    def build_report(
        self,
        *,
        requirements: list[Requirement],
        violations: list[Violation],
    ) -> BuiltReport:
        _ = violations
        return BuiltReport(
            overall_status="compliant",
            summary="No requirement violations detected.",
            recommendations=[
                requirement.recommendation for requirement in requirements
            ],
        )


def test_start_analysis_use_case_runs_full_pipeline() -> None:
    repository = _InMemoryAnalysisRepository()
    pipeline = _StablePipeline()
    use_case = StartAnalysisUseCase(repository=repository, pipeline=pipeline)

    response = use_case.execute(
        request=StartAnalysisRequestDTO(document_id="doc-1", requested_by="student")
    )

    assert response.status is AnalysisStatus.ANALYZING
    assert repository.get_status(check_id=response.check_id) == AnalysisStatusSnapshot(
        check_id=response.check_id,
        status=AnalysisStatus.ANALYZING,
        progress=progress_for_status(AnalysisStatus.ANALYZING),
        error=None,
    )

    use_case.run_pipeline(check_id=response.check_id, document_id="doc-1")

    assert repository.status_updates == [
        AnalysisStatus.TYPE_DETERMINED,
        AnalysisStatus.SEMESTER_DETERMINED,
        AnalysisStatus.REQUIREMENTS_CHECKED,
        AnalysisStatus.REPORT_READY,
    ]
    assert repository.get_status(check_id=response.check_id) == AnalysisStatusSnapshot(
        check_id=response.check_id,
        status=AnalysisStatus.REPORT_READY,
        progress=progress_for_status(AnalysisStatus.REPORT_READY),
        error=None,
    )

    report = repository.get_report(check_id=response.check_id)
    assert report is not None
    assert report.document_type == "COURSE_PROJECT_NOTE"
    assert report.semester == 4
    assert report.rules == ["REQ-INTRO-001"]


def test_start_analysis_rejects_duplicate_active_check() -> None:
    repository = _InMemoryAnalysisRepository(
        active_checks_by_document={"doc-1": "check-1"}
    )
    pipeline = _StablePipeline()
    use_case = StartAnalysisUseCase(repository=repository, pipeline=pipeline)

    with pytest.raises(AppError) as exc_info:
        use_case.execute(
            request=StartAnalysisRequestDTO(document_id="doc-1", requested_by="teacher")
        )

    assert exc_info.value.code == "ANALYSIS_ALREADY_RUNNING"
    assert exc_info.value.status_code == 409


def test_start_analysis_marks_error_when_pipeline_fails() -> None:
    repository = _InMemoryAnalysisRepository()
    pipeline = _StablePipeline(fail_on_semester=True)
    use_case = StartAnalysisUseCase(repository=repository, pipeline=pipeline)

    response = use_case.execute(
        request=StartAnalysisRequestDTO(document_id="doc-1", requested_by="student")
    )
    use_case.run_pipeline(check_id=response.check_id, document_id="doc-1")

    status = repository.get_status(check_id=response.check_id)
    assert status is not None
    assert status.status is AnalysisStatus.ERROR
    assert status.progress == progress_for_status(AnalysisStatus.ERROR)
    assert status.error == "semester detection failed"
