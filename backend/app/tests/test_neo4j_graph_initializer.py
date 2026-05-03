from pathlib import Path
from typing import Any

from app.infrastructure.neo4j.cypher import CypherFileLoader
from app.infrastructure.neo4j.graph_initializer import Neo4jGraphInitializer


class _FakeResult:
    def consume(self) -> None:
        return None


class _FakeSession:
    def __init__(self, statements: list[str]) -> None:
        self._statements = statements

    def __enter__(self) -> "_FakeSession":
        return self

    def __exit__(self, *_: Any) -> None:
        return None

    def run(self, statement: str, **_: Any) -> _FakeResult:
        self._statements.append(statement)
        return _FakeResult()


class _FakeClient:
    def __init__(self) -> None:
        self.executed_statements: list[str] = []

    def get_session(self) -> _FakeSession:
        return _FakeSession(self.executed_statements)


def _write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def test_initializer_runs_schema_and_seeds_in_order(tmp_path: Path) -> None:
    _write_file(tmp_path / "schema/constraints.cypher", "RETURN 'constraints';")
    _write_file(tmp_path / "schema/indexes.cypher", "RETURN 'indexes';")
    _write_file(tmp_path / "data/seed_document_types.cypher", "RETURN 'seed_doc_types';")
    _write_file(tmp_path / "data/seed_semesters.cypher", "RETURN 'seed_semesters';")
    _write_file(tmp_path / "data/seed_requirements.cypher", "RETURN 'seed_requirements';")

    loader = CypherFileLoader(assets_root=tmp_path)
    client = _FakeClient()
    initializer = Neo4jGraphInitializer(client=client, cypher_loader=loader)

    initializer.initialize()

    assert client.executed_statements == [
        "RETURN 'constraints'",
        "RETURN 'indexes'",
        "RETURN 'seed_doc_types'",
        "RETURN 'seed_semesters'",
        "RETURN 'seed_requirements'",
    ]
