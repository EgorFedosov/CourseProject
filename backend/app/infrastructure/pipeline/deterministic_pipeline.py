from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass
from uuid import uuid4

from app.application.ports.ai_assistant import AiAssistant, AiSuggestion
from app.application.ports.analysis_pipeline import (
    AnalysisPipeline,
    BuiltReport,
    ParsedDocument,
)
from app.application.ports.document_repository import DocumentRepository
from app.application.ports.feedback_repository import FeedbackRepository
from app.application.ports.rule_read_repository import RuleReadRepository
from app.core.errors import AppError
from app.domain.entities.requirement import Requirement
from app.domain.entities.violation import Violation
from app.infrastructure.parsers.unified_document_parser import UnifiedDocumentParser

_SECTION_ALIASES: dict[str, tuple[str, ...]] = {
    "introduction": ("introduction", "введение"),
    "conclusion": ("conclusion", "заключение", "выводы"),
}

_SEMESTER_PATTERN = re.compile(r"(?:semester|семестр)\s*[:\-]?\s*(\d{1,2})", re.IGNORECASE)


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def _normalize_font_name(value: str) -> str:
    normalized = value.strip().lower()
    normalized = normalized.replace("-", " ")
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized


def _select_dominant_string(values: list[str]) -> str | None:
    cleaned = [item.strip() for item in values if item and item.strip()]
    if not cleaned:
        return None
    return Counter(cleaned).most_common(1)[0][0]


def _select_dominant_number(values: list[float]) -> float | None:
    if not values:
        return None
    rounded = [round(item, 1) for item in values]
    return Counter(rounded).most_common(1)[0][0]


def _build_token_list(text: str) -> list[str]:
    return re.findall(r"[\w\-]+", text.lower(), flags=re.UNICODE)


@dataclass(frozen=True, slots=True)
class DeterministicAnalysisPipeline(AnalysisPipeline):
    rule_repository: RuleReadRepository
    feedback_repository: FeedbackRepository | None = None
    ai_assistant: AiAssistant | None = None
    similar_cases_limit: int = 5
    document_repository: DocumentRepository | None = None
    document_parser: UnifiedDocumentParser | None = None

    def parse(self, *, document_id: str) -> ParsedDocument:
        if self.document_repository is None or self.document_parser is None:
            return self._fallback_parse(document_id=document_id)

        document = self.document_repository.get_by_id(document_id=document_id)
        if document is None:
            raise AppError(
                code="DOCUMENT_NOT_FOUND",
                message="Документ не найден.",
                status_code=404,
                details={"document_id": document_id},
            )

        parsed_file = self.document_parser.parse(
            storage_path=document.storage_path,
            file_format=document.format,
        )
        raw_text = parsed_file.raw_text or document.filename
        tokens = _build_token_list(raw_text)
        normalized_sections = [_normalize_text(section) for section in parsed_file.sections]
        dominant_font_family = _select_dominant_string(parsed_file.font_families)
        dominant_font_size = _select_dominant_number(parsed_file.font_sizes)

        return ParsedDocument(
            document_id=document_id,
            raw_text=raw_text,
            features={
                "document_id": document_id,
                "filename": document.filename,
                "format": document.format,
                "storage_path": document.storage_path,
                "tokens": tokens,
                "length": len(raw_text),
                "sections": parsed_file.sections,
                "sections_normalized": normalized_sections,
                "dominant_font_family": dominant_font_family,
                "dominant_font_size": dominant_font_size,
                "font_families": parsed_file.font_families,
                "font_sizes": parsed_file.font_sizes,
            },
        )

    def _fallback_parse(self, *, document_id: str) -> ParsedDocument:
        normalized_text = document_id.lower()
        return ParsedDocument(
            document_id=document_id,
            raw_text=normalized_text,
            features={
                "document_id": document_id,
                "tokens": normalized_text.split("-"),
                "length": len(document_id),
                "sections": [],
                "sections_normalized": [],
                "dominant_font_family": None,
                "dominant_font_size": None,
                "font_families": [],
                "font_sizes": [],
            },
        )

    def _get_ai_suggestion(
        self, *, parsed_document: ParsedDocument
    ) -> AiSuggestion | None:
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

        text = parsed_document.raw_text.lower()
        if "лабораторн" in text or "lab report" in text:
            return "LAB_REPORT"
        if "course work" in text or "курсовая работа" in text:
            return "COURSE_WORK_REPORT"
        return "COURSE_PROJECT_NOTE"

    def detect_semester(
        self, *, parsed_document: ParsedDocument, document_type: str
    ) -> int:
        _ = document_type
        suggestion = self._get_ai_suggestion(parsed_document=parsed_document)
        if suggestion is not None:
            return suggestion.predicted_semester

        raw_text = parsed_document.raw_text
        semester_match = _SEMESTER_PATTERN.search(raw_text)
        if semester_match is not None:
            try:
                semester = int(semester_match.group(1))
                if 1 <= semester <= 12:
                    return semester
            except ValueError:
                pass

        tokens = {
            token.lower()
            for token in parsed_document.features.get("tokens", [])
            if isinstance(token, str)
        }
        if {"kp4", "кп4", "semester4", "семестр4"} & tokens:
            return 4
        if {"semester6", "семестр6", "s6"} & tokens:
            return 6
        if {"semester2", "семестр2", "s2"} & tokens:
            return 2
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
        violations: list[Violation] = []

        for requirement in requirements:
            condition_type = str(requirement.condition_json.get("type") or "")

            if condition_type == "required_section":
                violation = self._check_required_section(
                    parsed_document=parsed_document,
                    requirement=requirement,
                )
                if violation:
                    violations.append(violation)
                continue

            if condition_type == "font_rule":
                violation = self._check_font_rule(
                    parsed_document=parsed_document,
                    requirement=requirement,
                )
                if violation:
                    violations.append(violation)

        return violations

    def _check_required_section(
        self,
        *,
        parsed_document: ParsedDocument,
        requirement: Requirement,
    ) -> Violation | None:
        section = str(requirement.condition_json.get("section") or "").strip().lower()
        if not section:
            return None

        aliases = _SECTION_ALIASES.get(section, (section,))
        min_occurrences = int(requirement.condition_json.get("min_occurrences") or 1)

        normalized_sections = [
            str(item)
            for item in parsed_document.features.get("sections_normalized", [])
            if isinstance(item, str)
        ]
        hits = 0
        for candidate in normalized_sections:
            if any(alias in candidate for alias in aliases):
                hits += 1

        if hits == 0:
            raw_text = parsed_document.raw_text.lower()
            for alias in aliases:
                hits += len(
                    re.findall(
                        rf"(?mi)^\s*{re.escape(alias)}\s*$",
                        raw_text,
                    )
                )

        if hits >= min_occurrences:
            return None

        section_name_ru = "Введение" if section == "introduction" else "Заключение" if section == "conclusion" else section
        return Violation(
            violation_id=str(uuid4()),
            code=requirement.code,
            message=f"Не найден обязательный раздел «{section_name_ru}».",
            severity=requirement.severity,
            confidence=0.95,
            evidence_json={
                "section": section,
                "required_occurrences": min_occurrences,
                "found_occurrences": hits,
            },
        )

    def _check_font_rule(
        self,
        *,
        parsed_document: ParsedDocument,
        requirement: Requirement,
    ) -> Violation | None:
        required_font = str(requirement.condition_json.get("font_family") or "").strip()
        required_font_size_raw = requirement.condition_json.get("font_size")

        if not required_font and required_font_size_raw in (None, ""):
            return None

        try:
            required_size = float(required_font_size_raw)
        except (TypeError, ValueError):
            required_size = None

        actual_font = parsed_document.features.get("dominant_font_family")
        actual_font_name = (
            str(actual_font).strip() if isinstance(actual_font, str) else None
        )

        actual_size_raw = parsed_document.features.get("dominant_font_size")
        actual_size = float(actual_size_raw) if isinstance(actual_size_raw, (int, float)) else None

        font_ok = True
        if required_font:
            font_ok = (
                actual_font_name is not None
                and _normalize_font_name(actual_font_name)
                == _normalize_font_name(required_font)
            )

        size_ok = True
        if required_size is not None:
            size_ok = actual_size is not None and abs(actual_size - required_size) <= 0.5

        if font_ok and size_ok:
            return None

        return Violation(
            violation_id=str(uuid4()),
            code=requirement.code,
            message=(
                "Основной шрифт документа не соответствует требованию "
                f"«{required_font} {int(required_size) if required_size is not None else ''}»."
            ).strip(),
            severity=requirement.severity,
            confidence=0.8,
            evidence_json={
                "expected_font_family": required_font or None,
                "expected_font_size": required_size,
                "actual_font_family": actual_font_name,
                "actual_font_size": actual_size,
            },
        )

    def build_report(
        self,
        *,
        requirements: list[Requirement],
        violations: list[Violation],
    ) -> BuiltReport:
        if violations:
            overall_status = "partially_compliant"
            summary = "Обнаружены нарушения требований."
        else:
            overall_status = "compliant"
            summary = "Нарушения требований не обнаружены."

        recommendations = [
            self._localize_recommendation(requirement=requirement)
            for requirement in requirements
        ]

        return BuiltReport(
            overall_status=overall_status,
            summary=summary,
            recommendations=recommendations,
        )

    def _localize_recommendation(self, *, requirement: Requirement) -> str:
        condition_type = str(requirement.condition_json.get("type") or "")
        if condition_type == "required_section":
            section = str(requirement.condition_json.get("section") or "").strip().lower()
            if section == "introduction":
                return "Добавьте раздел «Введение» перед основной частью документа."
            if section == "conclusion":
                return "Добавьте раздел «Заключение» с итоговыми выводами."
            if section:
                return f"Добавьте обязательный раздел «{section}»."

        if condition_type == "font_rule":
            required_font = str(requirement.condition_json.get("font_family") or "").strip()
            required_size = requirement.condition_json.get("font_size")
            if required_font and required_size is not None:
                return f"Приведите основной текст к шрифту {required_font} {required_size} пт."
            return "Проверьте соответствие шрифтов и размера текста требованиям."

        recommendation = requirement.recommendation.strip()
        if recommendation:
            return recommendation
        return "Проверьте документ на соответствие требованиям."
