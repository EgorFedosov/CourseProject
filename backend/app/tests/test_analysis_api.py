from dataclasses import dataclass

from fastapi.testclient import TestClient

from app.api.v1.routes.analysis_dependencies import (
    get_analysis_status_use_case,
    get_report_use_case,
    get_start_analysis_use_case,
    get_submit_feedback_use_case,
)
from app.application.dto.analysis import (
    AnalysisStatusResponseDTO,
    StartAnalysisRequestDTO,
    StartAnalysisResponseDTO,
)
from app.application.dto.feedback import (
    FeedbackCorrectionsRequestDTO,
    FeedbackCorrectionsResponseDTO,
)
from app.application.dto.report import ReportResponseDTO, ReportViolationDTO
from app.domain.value_objects.analysis_status import AnalysisStatus
from app.main import app

client = TestClient(app)


@dataclass
class _StubStartAnalysisUseCase:
    started_document_id: str | None = None

    def execute(self, *, request: StartAnalysisRequestDTO) -> StartAnalysisResponseDTO:
        self.started_document_id = request.document_id
        return StartAnalysisResponseDTO(
            check_id="check-123",
            status=AnalysisStatus.ANALYZING,
        )

    def run_pipeline(self, *, check_id: str, document_id: str) -> None:
        _ = check_id
        _ = document_id


@dataclass
class _StubStatusUseCase:
    def execute(self, *, check_id: str) -> AnalysisStatusResponseDTO:
        _ = check_id
        return AnalysisStatusResponseDTO(
            check_id="check-123",
            status=AnalysisStatus.SEMESTER_DETERMINED,
            progress=55,
            error=None,
        )


@dataclass
class _StubReportUseCase:
    def execute(self, *, check_id: str) -> ReportResponseDTO:
        _ = check_id
        return ReportResponseDTO(
            check_id="check-123",
            type="COURSE_PROJECT_NOTE",
            semester=4,
            rules=["REQ-INTRO-001"],
            violations=[
                ReportViolationDTO(
                    violation_id="v-1",
                    code="REQ-INTRO-001",
                    message="Missing introduction",
                    severity="high",
                    confidence=0.99,
                    evidence={"section": "intro"},
                )
            ],
            recommendations=["Add an Introduction section."],
            overall_status="partially_compliant",
        )


@dataclass
class _StubFeedbackUseCase:
    def execute(
        self,
        *,
        payload: FeedbackCorrectionsRequestDTO,
    ) -> FeedbackCorrectionsResponseDTO:
        _ = payload
        return FeedbackCorrectionsResponseDTO(
            case_id="case-1",
            check_id="check-123",
            status="SAVED",
            ai_mode="RULE_ONLY",
            ai_suggestion=None,
        )


def test_start_analysis_endpoint_contract() -> None:
    stub_use_case = _StubStartAnalysisUseCase()
    app.dependency_overrides[get_start_analysis_use_case] = lambda: stub_use_case

    try:
        response = client.post(
            "/api/v1/analyses/start",
            json={"document_id": "doc-1", "requested_by": "student"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload == {"check_id": "check-123", "status": "ANALYZING"}
    assert stub_use_case.started_document_id == "doc-1"


def test_analysis_status_endpoint_contract() -> None:
    app.dependency_overrides[get_analysis_status_use_case] = (
        lambda: _StubStatusUseCase()
    )

    try:
        response = client.get("/api/v1/analyses/check-123")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload == {
        "check_id": "check-123",
        "status": "SEMESTER_DETERMINED",
        "progress": 55,
        "error": None,
    }


def test_report_endpoint_contract() -> None:
    app.dependency_overrides[get_report_use_case] = lambda: _StubReportUseCase()

    try:
        response = client.get("/api/v1/reports/check-123")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["check_id"] == "check-123"
    assert payload["type"] == "COURSE_PROJECT_NOTE"
    assert payload["semester"] == 4
    assert payload["rules"] == ["REQ-INTRO-001"]
    assert payload["overall_status"] == "partially_compliant"
    assert len(payload["violations"]) == 1
    assert payload["violations"][0]["violation_id"] == "v-1"


def test_feedback_corrections_endpoint_contract() -> None:
    app.dependency_overrides[get_submit_feedback_use_case] = (
        lambda: _StubFeedbackUseCase()
    )

    try:
        response = client.post(
            "/api/v1/feedback/corrections",
            json={
                "check_id": "check-123",
                "final_type": "COURSE_PROJECT_NOTE",
                "final_semester": 4,
                "confirmed_violations": ["v-1"],
                "rejected_violations": [],
                "teacher_comment": "Looks good",
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload == {
        "case_id": "case-1",
        "check_id": "check-123",
        "status": "SAVED",
        "ai_mode": "RULE_ONLY",
        "ai_suggestion": None,
    }
