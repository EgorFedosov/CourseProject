from __future__ import annotations

from dataclasses import dataclass

from app.application.ports.ai_assistant import AiAssistant, AiSuggestion
from app.application.ports.analysis_pipeline import (
    AnalysisPipeline,
    BuiltReport,
    ParsedDocument,
)
from app.application.ports.feedback_repository import FeedbackRepository
from app.application.ports.rule_read_repository import RuleReadRepository
from app.domain.entities.requirement import Requirement
from app.domain.entities.violation import Violation


@dataclass(frozen=True, slots=True)
class DeterministicAnalysisPipeline(AnalysisPipeline):
    rule_repository: RuleReadRepository
    feedback_repository: FeedbackRepository | None = None
    ai_assistant: AiAssistant | None = None
    similar_cases_limit: int = 5

    def parse(self, *, document_id: str) -> ParsedDocument:
        normalized_text = document_id.lower()
        return ParsedDocument(
            document_id=document_id,
            raw_text=normalized_text,
            features={
                "document_id": document_id,
                "tokens": normalized_text.split("-"),
                "length": len(document_id),
            },
        )

    def _get_ai_suggestion(self, *, parsed_document: ParsedDocument) -> AiSuggestion | None:
        if self.ai_assistant is None or self.feedback_repository is None:
            return None

        similar_cases = self.feedback_repository.get_similar_correction_cases(
            document_type_code=None,
            semester_number=None,
            limit=self.similar_cases_limit,
        )

        return self.ai_assistant.suggest(
            doc_features=parsed_document.features,
            similar_cases=similar_cases,
        )

    def detect_document_type(self, *, parsed_document: ParsedDocument) -> str:
        suggestion = self._get_ai_suggestion(parsed_document=parsed_document)
        if suggestion is not None and suggestion.predicted_type:
            return suggestion.predicted_type

        return "COURSE_PROJECT_NOTE"

    def detect_semester(self, *, parsed_document: ParsedDocument, document_type: str) -> int:
        _ = document_type
        suggestion = self._get_ai_suggestion(parsed_document=parsed_document)
        if suggestion is not None:
            return suggestion.predicted_semester

        return 4

    def select_rules(self, *, document_type: str, semester: int) -> list[Requirement]:
        return self.rule_repository.get_active_rules_for_type_and_semester(
            document_type_code=document_type,
            semester_number=semester,
        )

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
        if violations:
            overall_status = "partially_compliant"
            summary = "Requirement violations detected."
        else:
            overall_status = "compliant"
            summary = "No requirement violations detected."

        recommendations = [requirement.recommendation for requirement in requirements]

        return BuiltReport(
            overall_status=overall_status,
            summary=summary,
            recommendations=recommendations,
        )
