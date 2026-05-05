from __future__ import annotations

from dataclasses import dataclass

from app.application.ports.analysis_pipeline import (
    AnalysisPipeline,
    BuiltReport,
    ParsedDocument,
)
from app.application.ports.rule_read_repository import RuleReadRepository
from app.domain.entities.requirement import Requirement
from app.domain.entities.violation import Violation


@dataclass(frozen=True, slots=True)
class DeterministicAnalysisPipeline(AnalysisPipeline):
    rule_repository: RuleReadRepository

    def parse(self, *, document_id: str) -> ParsedDocument:
        # Stage 7 wires orchestration and status transitions.
        # A deterministic parse marker keeps the pipeline stable before parser integration.
        return ParsedDocument(document_id=document_id, raw_text=document_id.lower())

    def detect_document_type(self, *, parsed_document: ParsedDocument) -> str:
        _ = parsed_document
        return "COURSE_PROJECT_NOTE"

    def detect_semester(self, *, parsed_document: ParsedDocument, document_type: str) -> int:
        _ = parsed_document
        _ = document_type
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
