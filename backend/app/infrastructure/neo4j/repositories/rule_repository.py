from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from app.application.ports.rule_read_repository import RuleReadRepository
from app.domain.entities.requirement import Requirement
from app.infrastructure.neo4j.client import Neo4jClient
from app.infrastructure.neo4j.cypher import CypherFileLoader


def _parse_condition_json(value: str | None) -> dict[str, Any]:
    if not value:
        return {}

    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return {}

    if isinstance(parsed, dict):
        return parsed
    return {}


@dataclass(frozen=True, slots=True)
class Neo4jRuleRepository(RuleReadRepository):
    client: Neo4jClient
    cypher_loader: CypherFileLoader

    def get_active_rules_for_type_and_semester(
        self,
        *,
        document_type_code: str,
        semester_number: int,
    ) -> list[Requirement]:
        query = self.cypher_loader.load_query("queries/get_rules_by_type_and_semester.cypher")

        with self.client.get_session() as session:
            result = session.run(
                query,
                document_type_code=document_type_code,
                semester_number=semester_number,
            )

            requirements: list[Requirement] = []
            for record in result:
                requirements.append(
                    Requirement(
                        code=record["code"],
                        title=record["title"],
                        category=record["category"],
                        severity=record["severity"],
                        condition_json=_parse_condition_json(record["condition_json"]),
                        message_template=record["message_template"],
                        recommendation=record["recommendation"],
                        version=record["version"],
                        is_active=record["is_active"],
                    )
                )

        return requirements
