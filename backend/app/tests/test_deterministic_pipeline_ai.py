from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from app.application.ports.ai_assistant import AiSuggestion
from app.domain.entities.correction_case import CorrectionCase
from app.domain.entities.requirement import Requirement
from app.infrastructure.pipeline.deterministic_pipeline import DeterministicAnalysisPipeline


@dataclass
class _StubRuleRepository:
    def get_active_rules_for_type_and_semester(
        self,
        *,
        document_type_code: str,
        semester_number: int,
    ) -> list[Requirement]:
        _ = document_type_code
        _ = semester_number
        return [
            Requirement(
                code="REQ-INTRO-001",
                title="Intro",
                category="structure",
                severity="high",
                condition_json={},
                message_template="msg",
                recommendation="Add intro",
                version="1.0.0",
                is_active=True,
            )
        ]


@dataclass
class _StubFeedbackRepository:
    calls: int = 0

    def get_similar_correction_cases(
        self,
        *,
        document_type_code: str | None,
        semester_number: int | None,
        limit: int = 5,
    ) -> list[CorrectionCase]:
        _ = document_type_code
        _ = semester_number
        _ = limit
        self.calls += 1
        return [
            CorrectionCase(
                case_id="case-1",
                doc_features_json={"tokens": ["kп4"]},
                predicted_type="COURSE_PROJECT_NOTE",
                final_type="COURSE_PROJECT_NOTE",
                predicted_semester=3,
                final_semester=4,
                predicted_violations_json=[],
                final_violations_json=[],
                teacher_comment=None,
                created_at=datetime.now(),
            )
        ]


@dataclass
class _StubAiAssistant:
    suggestion: AiSuggestion | None
    seen_features: list[dict[str, object]] = field(default_factory=list)

    def suggest(
        self,
        *,
        doc_features: dict[str, object],
        similar_cases: list[CorrectionCase],
    ) -> AiSuggestion | None:
        _ = similar_cases
        self.seen_features.append(doc_features)
        return self.suggestion


def test_pipeline_uses_ai_suggestion_for_type_and_semester() -> None:
    feedback_repository = _StubFeedbackRepository()
    ai_assistant = _StubAiAssistant(
        suggestion=AiSuggestion(
            predicted_type="COURSE_PROJECT_NOTE",
            type_confidence=0.8,
            predicted_semester=5,
            semester_confidence=0.7,
            explanations=[],
            risk_flags=[],
        )
    )
    pipeline = DeterministicAnalysisPipeline(
        rule_repository=_StubRuleRepository(),
        feedback_repository=feedback_repository,
        ai_assistant=ai_assistant,
    )

    parsed = pipeline.parse(document_id="doc-xyz")
    detected_type = pipeline.detect_document_type(parsed_document=parsed)
    detected_semester = pipeline.detect_semester(
        parsed_document=parsed,
        document_type=detected_type,
    )

    assert detected_type == "COURSE_PROJECT_NOTE"
    assert detected_semester == 5
    assert feedback_repository.calls >= 2
    assert ai_assistant.seen_features


def test_pipeline_falls_back_to_rule_only_defaults_when_ai_missing() -> None:
    pipeline = DeterministicAnalysisPipeline(
        rule_repository=_StubRuleRepository(),
        feedback_repository=_StubFeedbackRepository(),
        ai_assistant=_StubAiAssistant(suggestion=None),
    )

    parsed = pipeline.parse(document_id="doc-xyz")

    assert pipeline.detect_document_type(parsed_document=parsed) == "COURSE_PROJECT_NOTE"
    assert pipeline.detect_semester(parsed_document=parsed, document_type="COURSE_PROJECT_NOTE") == 4
