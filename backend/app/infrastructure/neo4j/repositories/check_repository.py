from __future__ import annotations

import json
from collections.abc import Mapping
from dataclasses import dataclass

from app.application.ports.check_write_repository import CheckWriteRepository
from app.domain.entities.check import Check
from app.domain.entities.report import Report
from app.domain.entities.violation import Violation
from app.infrastructure.neo4j.client import Neo4jClient
from app.infrastructure.neo4j.cypher import CypherFileLoader


@dataclass(frozen=True, slots=True)
class Neo4jCheckRepository(CheckWriteRepository):
    client: Neo4jClient
    cypher_loader: CypherFileLoader

    def save_check(
        self,
        *,
        check: Check,
        document_id: str,
        used_requirement_codes: list[str],
    ) -> None:
        query = self.cypher_loader.load_query("queries/save_check.cypher")

        with self.client.get_session() as session:
            session.run(
                query,
                check_id=check.check_id,
                started_at=check.started_at.isoformat(),
                finished_at=(
                    check.finished_at.isoformat() if check.finished_at else None
                ),
                status=check.status,
                document_id=document_id,
                used_requirement_codes=used_requirement_codes,
            ).consume()

    def save_violations(
        self,
        *,
        check_id: str,
        violations: list[Violation],
        violation_requirement_map: Mapping[str, str],
    ) -> None:
        if not violations:
            return

        query = self.cypher_loader.load_query("queries/save_violations.cypher")
        serialized_violations = [
            {
                "violation_id": violation.violation_id,
                "code": violation.code,
                "message": violation.message,
                "severity": violation.severity,
                "evidence_json": json.dumps(
                    violation.evidence_json or {}, ensure_ascii=True
                ),
                "confidence": violation.confidence,
                "requirement_code": violation_requirement_map[violation.violation_id],
            }
            for violation in violations
        ]

        with self.client.get_session() as session:
            session.run(
                query,
                check_id=check_id,
                violations=serialized_violations,
            ).consume()

    def save_report(self, *, report: Report, check_id: str) -> None:
        query = self.cypher_loader.load_query("queries/save_report.cypher")

        with self.client.get_session() as session:
            session.run(
                query,
                report_id=report.report_id,
                overall_status=report.overall_status,
                summary=report.summary,
                generated_at=report.generated_at.isoformat(),
                path=report.path,
                check_id=check_id,
            ).consume()
