from __future__ import annotations

from dataclasses import dataclass, field

import pytest

from app.application.dto.feedback import FeedbackCorrectionsRequestDTO
from app.application.ports.ai_assistant import AiSuggestion
from app.application.ports.analysis_repository import ReportSnapshot
from app.application.use_cases.submit_feedback_corrections import (
    SubmitFeedbackCorrectionsUseCase,
)
from app.core.config import Settings
from app.core.errors import AppError
from app.domain.entities.correction_case import CorrectionCase
from app.domain.entities.violation import Violation


@dataclass
class _StubAnalysisRepository:
    report: ReportSnapshot | None

    def get_report(self, *, check_id: str) -> ReportSnapshot | None:
        _ = check_id
        return self.report


@dataclass
class _StubFeedbackRepository:
    saved_cases: list[CorrectionCase] = field(default_factory=list)
    similar_cases: list[CorrectionCase] = field(default_factory=list)

    def save_correction_case(self, *, correction_case: CorrectionCase) -> None:
        self.saved_cases.append(correction_case)

    def get_similar_correction_cases(
        self,
        *,
        document_type_code: str | None,
        semester_number: int | None,
        limit: int = 5,
    ) -> list[CorrectionCase]:
        _ = document_type_code
        _ = semester_number
        return self.similar_cases[:limit]


@dataclass
class _StubAiAssistant:
    suggestion: AiSuggestion | None

    def suggest(
        self,
        *,
        doc_features: dict[str, object],
        similar_cases: list[CorrectionCase],
    ) -> AiSuggestion | None:
        _ = doc_features
        _ = similar_cases
        return self.suggestion


def _build_report_snapshot() -> ReportSnapshot:
    return ReportSnapshot(
        check_id="check-1",
        report_id="report-1",
        document_type="COURSE_PROJECT_NOTE",
        semester=4,
        rules=["REQ-INTRO-001"],
        violations=[
            Violation(
                violation_id="v-1",
                code="REQ-INTRO-001",
                message="Missing introduction",
                severity="high",
            )
        ],
        recommendations=["Add an Introduction section."],
        overall_status="partially_compliant",
    )


def _build_settings() -> Settings:
    return Settings(
        neo4j_uri="bolt://localhost:7687",
        neo4j_user="neo4j",
        neo4j_password="password",
    )


def test_submit_feedback_saves_case_and_returns_ai_adaptation() -> None:
    analysis_repository = _StubAnalysisRepository(report=_build_report_snapshot())
    feedback_repository = _StubFeedbackRepository()
    ai_assistant = _StubAiAssistant(
        suggestion=AiSuggestion(
            predicted_type="COURSE_PROJECT_NOTE",
            type_confidence=0.9,
            predicted_semester=4,
            semester_confidence=0.88,
            explanations=["Marker КП4 detected"],
            risk_flags=[],
        )
    )

    use_case = SubmitFeedbackCorrectionsUseCase(
        analysis_repository=analysis_repository,
        feedback_repository=feedback_repository,
        settings=_build_settings(),
        ai_assistant=ai_assistant,
    )

    response = use_case.execute(
        payload=FeedbackCorrectionsRequestDTO(
            check_id="check-1",
            final_type="COURSE_PROJECT_NOTE",
            final_semester=4,
            confirmed_violations=["v-1"],
            rejected_violations=[],
            teacher_comment="Correct",
        )
    )

    assert response.status == "SAVED"
    assert response.ai_mode == "ADAPTED"
    assert response.ai_suggestion is not None
    assert response.ai_suggestion.predicted_type == "COURSE_PROJECT_NOTE"
    assert len(feedback_repository.saved_cases) == 1


def test_submit_feedback_falls_back_to_rule_only_when_ai_unavailable() -> None:
    analysis_repository = _StubAnalysisRepository(report=_build_report_snapshot())
    feedback_repository = _StubFeedbackRepository()
    ai_assistant = _StubAiAssistant(suggestion=None)

    use_case = SubmitFeedbackCorrectionsUseCase(
        analysis_repository=analysis_repository,
        feedback_repository=feedback_repository,
        settings=_build_settings(),
        ai_assistant=ai_assistant,
    )

    response = use_case.execute(
        payload=FeedbackCorrectionsRequestDTO(
            check_id="check-1",
            final_type="COURSE_PROJECT_NOTE",
            final_semester=4,
            confirmed_violations=[],
            rejected_violations=["v-1"],
            teacher_comment=None,
        )
    )

    assert response.status == "SAVED"
    assert response.ai_mode == "RULE_ONLY"
    assert response.ai_suggestion is None
    assert len(feedback_repository.saved_cases) == 1


def test_submit_feedback_raises_when_report_missing() -> None:
    use_case = SubmitFeedbackCorrectionsUseCase(
        analysis_repository=_StubAnalysisRepository(report=None),
        feedback_repository=_StubFeedbackRepository(),
        settings=_build_settings(),
        ai_assistant=None,
    )

    with pytest.raises(AppError) as exc_info:
        use_case.execute(
            payload=FeedbackCorrectionsRequestDTO(
                check_id="check-missing",
                final_type="COURSE_PROJECT_NOTE",
                final_semester=4,
                confirmed_violations=[],
                rejected_violations=[],
                teacher_comment=None,
            )
        )

    assert exc_info.value.code == "REPORT_NOT_FOUND"
