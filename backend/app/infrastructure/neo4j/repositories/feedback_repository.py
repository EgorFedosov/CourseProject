from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from app.application.ports.feedback_repository import FeedbackRepository
from app.domain.entities.correction_case import CorrectionCase
from app.infrastructure.neo4j.client import Neo4jClient
from app.infrastructure.neo4j.cypher import CypherFileLoader


def _safe_json_list(value: str | None) -> list[dict[str, Any]]:
    if not value:
        return []

    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []

    if isinstance(parsed, list):
        return [item for item in parsed if isinstance(item, dict)]
    return []


def _safe_json_dict(value: str | None) -> dict[str, Any]:
    if not value:
        return {}

    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return {}

    if isinstance(parsed, dict):
        return parsed
    return {}


def _parse_created_at(value: datetime | str | None) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return datetime.fromisoformat(value)
    return datetime.min


@dataclass(frozen=True, slots=True)
class Neo4jFeedbackRepository(FeedbackRepository):
    client: Neo4jClient
    cypher_loader: CypherFileLoader

    def save_correction_case(self, *, correction_case: CorrectionCase) -> None:
        query = self.cypher_loader.load_query("queries/save_correction_case.cypher")

        with self.client.get_session() as session:
            session.run(
                query,
                case_id=correction_case.case_id,
                doc_features_json=json.dumps(
                    correction_case.doc_features_json,
                    ensure_ascii=True,
                ),
                predicted_type=correction_case.predicted_type,
                final_type=correction_case.final_type,
                predicted_semester=correction_case.predicted_semester,
                final_semester=correction_case.final_semester,
                predicted_violations_json=json.dumps(
                    correction_case.predicted_violations_json,
                    ensure_ascii=True,
                ),
                final_violations_json=json.dumps(
                    correction_case.final_violations_json,
                    ensure_ascii=True,
                ),
                teacher_comment=correction_case.teacher_comment,
                created_at=correction_case.created_at.isoformat(),
            ).consume()

    def get_similar_correction_cases(
        self,
        *,
        document_type_code: str | None,
        semester_number: int | None,
        limit: int = 5,
    ) -> list[CorrectionCase]:
        query = self.cypher_loader.load_query("queries/get_similar_correction_cases.cypher")

        with self.client.get_session() as session:
            result = session.run(
                query,
                document_type_code=document_type_code,
                semester_number=semester_number,
                limit=limit,
            )

            correction_cases: list[CorrectionCase] = []
            for record in result:
                correction_cases.append(
                    CorrectionCase(
                        case_id=record["case_id"],
                        doc_features_json=_safe_json_dict(record["doc_features_json"]),
                        predicted_type=record["predicted_type"],
                        final_type=record["final_type"],
                        predicted_semester=record["predicted_semester"],
                        final_semester=record["final_semester"],
                        predicted_violations_json=_safe_json_list(
                            record["predicted_violations_json"]
                        ),
                        final_violations_json=_safe_json_list(
                            record["final_violations_json"]
                        ),
                        teacher_comment=record["teacher_comment"],
                        created_at=_parse_created_at(record["created_at"]),
                    )
                )

        return correction_cases
