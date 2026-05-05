from pathlib import Path
from typing import Any

from app.infrastructure.neo4j.cypher import CypherFileLoader
from app.infrastructure.neo4j.repositories.rule_repository import Neo4jRuleRepository


class _FakeSession:
    def __init__(self, records: list[dict[str, Any]]) -> None:
        self._records = records
        self.last_query: str | None = None
        self.last_params: dict[str, Any] = {}

    def __enter__(self) -> "_FakeSession":
        return self

    def __exit__(self, *_: Any) -> None:
        return None

    def run(self, query: str, **params: Any) -> list[dict[str, Any]]:
        self.last_query = query
        self.last_params = params
        return self._records


class _FakeClient:
    def __init__(self, records: list[dict[str, Any]]) -> None:
        self._session = _FakeSession(records=records)

    def get_session(self) -> _FakeSession:
        return self._session


def _write_query(path: Path, query: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(query, encoding="utf-8")


def test_rule_repository_loads_active_rules(tmp_path: Path) -> None:
    _write_query(
        tmp_path / "queries/get_rules_by_type_and_semester.cypher",
        "RETURN 1;",
    )
    loader = CypherFileLoader(assets_root=tmp_path)
    records = [
        {
            "code": "REQ-INTRO-001",
            "title": "Intro",
            "category": "structure",
            "severity": "high",
            "condition_json": '{"type":"required_section"}',
            "message_template": "msg",
            "recommendation": "rec",
            "version": "1.0.0",
            "is_active": True,
        }
    ]
    client = _FakeClient(records=records)
    repository = Neo4jRuleRepository(client=client, cypher_loader=loader)

    result = repository.get_active_rules_for_type_and_semester(
        document_type_code="COURSE_PROJECT_NOTE",
        semester_number=4,
    )

    assert len(result) == 1
    assert result[0].code == "REQ-INTRO-001"
    assert result[0].condition_json == {"type": "required_section"}
