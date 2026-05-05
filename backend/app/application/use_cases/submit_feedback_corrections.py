from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

from app.application.dto.feedback import (
    AiSuggestionDTO,
    FeedbackCorrectionsRequestDTO,
    FeedbackCorrectionsResponseDTO,
)
from app.application.ports.ai_assistant import AiAssistant
from app.application.ports.analysis_repository import AnalysisRepository
from app.application.ports.feedback_repository import FeedbackRepository
from app.core.config import Settings
from app.core.errors import AppError
from app.domain.entities.correction_case import CorrectionCase


def _build_report_doc_features(
    *,
    check_id: str,
    predicted_type: str,
    predicted_semester: int,
    rules: list[str],
    violation_ids: list[str],
) -> dict[str, object]:
    return {
        "check_id": check_id,
        "predicted_type": predicted_type,
        "predicted_semester": predicted_semester,
        "rules": rules,
        "violation_ids": violation_ids,
        "rule_count": len(rules),
        "violation_count": len(violation_ids),
    }


@dataclass(frozen=True, slots=True)
class SubmitFeedbackCorrectionsUseCase:
    analysis_repository: AnalysisRepository
    feedback_repository: FeedbackRepository
    settings: Settings
    ai_assistant: AiAssistant | None = None

    def execute(
        self,
        *,
        payload: FeedbackCorrectionsRequestDTO,
    ) -> FeedbackCorrectionsResponseDTO:
        report = self.analysis_repository.get_report(check_id=payload.check_id)
        if report is None:
            raise AppError(
                code="REPORT_NOT_FOUND",
                message="Report was not found for provided check_id.",
                status_code=404,
            )

        predicted_violations = [
            {
                "violation_id": violation.violation_id,
                "code": violation.code,
                "severity": violation.severity,
            }
            for violation in report.violations
        ]

        predicted_violation_ids = {
            violation.violation_id for violation in report.violations
        }
        confirmed_ids = set(payload.confirmed_violations)
        rejected_ids = set(payload.rejected_violations)

        final_violations: list[dict[str, object]] = []
        for violation in report.violations:
            if violation.violation_id in confirmed_ids:
                resolution = "confirmed"
            elif violation.violation_id in rejected_ids:
                resolution = "rejected"
            else:
                resolution = "unchanged"

            final_violations.append(
                {
                    "violation_id": violation.violation_id,
                    "code": violation.code,
                    "resolution": resolution,
                }
            )

        for violation_id in confirmed_ids - predicted_violation_ids:
            final_violations.append(
                {
                    "violation_id": violation_id,
                    "code": "UNKNOWN",
                    "resolution": "confirmed",
                }
            )

        for violation_id in rejected_ids - predicted_violation_ids:
            final_violations.append(
                {
                    "violation_id": violation_id,
                    "code": "UNKNOWN",
                    "resolution": "rejected",
                }
            )

        doc_features = _build_report_doc_features(
            check_id=payload.check_id,
            predicted_type=report.document_type,
            predicted_semester=report.semester,
            rules=report.rules,
            violation_ids=[violation["violation_id"] for violation in predicted_violations],
        )

        similar_cases = self.feedback_repository.get_similar_correction_cases(
            document_type_code=payload.final_type,
            semester_number=payload.final_semester,
            limit=self.settings.ai_similar_cases_limit,
        )

        ai_suggestion: AiSuggestionDTO | None = None
        ai_mode = "RULE_ONLY"
        if self.ai_assistant is not None:
            suggestion = self.ai_assistant.suggest(
                doc_features=doc_features,
                similar_cases=similar_cases,
            )
            if suggestion is not None:
                ai_mode = "ADAPTED"
                ai_suggestion = AiSuggestionDTO(
                    predicted_type=suggestion.predicted_type,
                    type_confidence=suggestion.type_confidence,
                    predicted_semester=suggestion.predicted_semester,
                    semester_confidence=suggestion.semester_confidence,
                    explanations=suggestion.explanations,
                    risk_flags=suggestion.risk_flags,
                )

        case_id = str(uuid4())
        self.feedback_repository.save_correction_case(
            correction_case=CorrectionCase(
                case_id=case_id,
                doc_features_json=doc_features,
                predicted_type=report.document_type,
                final_type=payload.final_type,
                predicted_semester=report.semester,
                final_semester=payload.final_semester,
                predicted_violations_json=predicted_violations,
                final_violations_json=final_violations,
                teacher_comment=payload.teacher_comment,
                created_at=datetime.now(timezone.utc),
            )
        )

        return FeedbackCorrectionsResponseDTO(
            case_id=case_id,
            check_id=payload.check_id,
            status="SAVED",
            ai_mode=ai_mode,
            ai_suggestion=ai_suggestion,
        )
