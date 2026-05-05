from __future__ import annotations

import json
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from app.application.ports.analysis_repository import (
    AnalysisRepository,
    AnalysisStatusSnapshot,
    ReportSnapshot,
)
from app.core.errors import AppError
from app.domain.entities.violation import Violation
from app.domain.value_objects.analysis_status import (
    AnalysisStatus,
    TERMINAL_ANALYSIS_STATUSES,
    progress_for_status,
)
from app.infrastructure.neo4j.client import Neo4jClient
from app.infrastructure.neo4j.cypher import CypherFileLoader


def _safe_json_list(value: str | None) -> list[Any]:
    if not value:
        return []

    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []

    if isinstance(parsed, list):
        return parsed
    return []


def _parse_status(value: str | None) -> AnalysisStatus:
    if value is None:
        return AnalysisStatus.ERROR

    try:
        return AnalysisStatus(value)
    except ValueError:
        return AnalysisStatus.ERROR


def _build_violation(value: dict[str, Any]) -> Violation:
    return Violation(
        violation_id=str(value.get("violation_id") or ""),
        code=str(value.get("code") or ""),
        message=str(value.get("message") or ""),
        severity=str(value.get("severity") or ""),
        evidence_json=(
            value.get("evidence") if isinstance(value.get("evidence"), dict) else None
        ),
        confidence=(
            value.get("confidence")
            if isinstance(value.get("confidence"), (int, float))
            else None
        ),
    )


@dataclass(frozen=True, slots=True)
class Neo4jAnalysisRepository(AnalysisRepository):
    client: Neo4jClient
    cypher_loader: CypherFileLoader

    def find_active_check_for_document(self, *, document_id: str) -> str | None:
        query = self.cypher_loader.load_query(
            "queries/find_active_check_for_document.cypher"
        )
        active_statuses = [
            status.value
            for status in AnalysisStatus
            if status not in TERMINAL_ANALYSIS_STATUSES
        ]

        with self.client.get_session() as session:
            record = session.run(
                query,
                document_id=document_id,
                active_statuses=active_statuses,
            ).single()

        if record is None:
            return None
        return record["check_id"]

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
        query = self.cypher_loader.load_query("queries/create_analysis_check.cypher")

        with self.client.get_session() as session:
            record = session.run(
                query,
                check_id=check_id,
                document_id=document_id,
                requested_by=requested_by,
                started_at=started_at.isoformat(),
                status=status.value,
                progress=progress,
            ).single()

        if record is None:
            raise AppError(
                code="DOCUMENT_NOT_FOUND",
                message="Document was not found.",
                status_code=404,
                details={"document_id": document_id},
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
        query = self.cypher_loader.load_query("queries/update_analysis_status.cypher")

        with self.client.get_session() as session:
            record = session.run(
                query,
                check_id=check_id,
                status=status.value,
                progress=progress,
                error=error,
                document_type=document_type,
                semester=semester,
                finished_at=finished_at.isoformat() if finished_at else None,
            ).single()

        if record is None:
            raise AppError(
                code="ANALYSIS_NOT_FOUND",
                message="Analysis was not found.",
                status_code=404,
                details={"check_id": check_id},
            )

    def save_used_rule_codes(self, *, check_id: str, rule_codes: Sequence[str]) -> None:
        query = self.cypher_loader.load_query("queries/save_used_rule_codes.cypher")

        with self.client.get_session() as session:
            session.run(query, check_id=check_id, rule_codes=list(rule_codes)).consume()

    def save_report(self, *, report: ReportSnapshot) -> None:
        query = self.cypher_loader.load_query("queries/save_report_snapshot.cypher")

        serialized_violations = [
            {
                "violation_id": violation.violation_id,
                "code": violation.code,
                "message": violation.message,
                "severity": violation.severity,
                "confidence": violation.confidence,
                "evidence": violation.evidence_json,
            }
            for violation in report.violations
        ]

        with self.client.get_session() as session:
            session.run(
                query,
                check_id=report.check_id,
                report_id=report.report_id,
                document_type=report.document_type,
                semester=report.semester,
                rules_json=json.dumps(report.rules, ensure_ascii=True),
                violations_json=json.dumps(serialized_violations, ensure_ascii=True),
                recommendations_json=json.dumps(
                    report.recommendations, ensure_ascii=True
                ),
                overall_status=report.overall_status,
            ).consume()

    def get_status(self, *, check_id: str) -> AnalysisStatusSnapshot | None:
        query = self.cypher_loader.load_query("queries/get_analysis_status.cypher")

        with self.client.get_session() as session:
            record = session.run(query, check_id=check_id).single()

        if record is None:
            return None

        status = _parse_status(record.get("status"))
        raw_progress = record.get("progress")
        progress = (
            raw_progress
            if isinstance(raw_progress, int)
            else progress_for_status(status)
        )
        error = record.get("error")

        return AnalysisStatusSnapshot(
            check_id=record["check_id"],
            status=status,
            progress=progress,
            error=error if isinstance(error, str) else None,
        )

    def get_report(self, *, check_id: str) -> ReportSnapshot | None:
        query = self.cypher_loader.load_query("queries/get_report_by_check_id.cypher")

        with self.client.get_session() as session:
            record = session.run(query, check_id=check_id).single()

        if record is None or record.get("report_id") is None:
            return None

        raw_rules = _safe_json_list(record.get("rules_json"))
        rules = [str(item) for item in raw_rules if isinstance(item, str)]

        raw_violations = _safe_json_list(record.get("violations_json"))
        violations = [
            _build_violation(item) for item in raw_violations if isinstance(item, dict)
        ]

        raw_recommendations = _safe_json_list(record.get("recommendations_json"))
        recommendations = [
            str(item) for item in raw_recommendations if isinstance(item, str)
        ]

        raw_semester = record.get("semester")
        semester = raw_semester if isinstance(raw_semester, int) else 0

        document_type = record.get("document_type")
        overall_status = record.get("overall_status")

        return ReportSnapshot(
            check_id=record["check_id"],
            report_id=record["report_id"],
            document_type=(
                document_type if isinstance(document_type, str) else "UNKNOWN"
            ),
            semester=semester,
            rules=rules,
            violations=violations,
            recommendations=recommendations,
            overall_status=(
                overall_status if isinstance(overall_status, str) else "unknown"
            ),
        )
