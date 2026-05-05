from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from app.domain.entities.requirement import Requirement
from app.domain.entities.violation import Violation


@dataclass(frozen=True, slots=True)
class ParsedDocument:
    document_id: str
    raw_text: str


@dataclass(frozen=True, slots=True)
class BuiltReport:
    overall_status: str
    summary: str
    recommendations: list[str]


class AnalysisPipeline(Protocol):
    def parse(self, *, document_id: str) -> ParsedDocument:
        ...

    def detect_document_type(self, *, parsed_document: ParsedDocument) -> str:
        ...

    def detect_semester(self, *, parsed_document: ParsedDocument, document_type: str) -> int:
        ...

    def select_rules(self, *, document_type: str, semester: int) -> list[Requirement]:
        ...

    def check_requirements(
        self,
        *,
        parsed_document: ParsedDocument,
        requirements: list[Requirement],
    ) -> list[Violation]:
        ...

    def build_report(
        self,
        *,
        requirements: list[Requirement],
        violations: list[Violation],
    ) -> BuiltReport:
        ...
