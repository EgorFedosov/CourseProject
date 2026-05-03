from pathlib import Path

from app.infrastructure.neo4j.cypher import CypherFileLoader, split_cypher_statements


def test_split_cypher_statements() -> None:
    content = """
    // comment
    CREATE CONSTRAINT test IF NOT EXISTS FOR (n:Node) REQUIRE n.id IS UNIQUE;

    CREATE INDEX test_idx IF NOT EXISTS FOR (n:Node) ON (n.name);
    """

    statements = split_cypher_statements(content)
    assert len(statements) == 2
    assert statements[0].startswith("CREATE CONSTRAINT")
    assert statements[1].startswith("CREATE INDEX")


def test_load_query_from_assets_root(tmp_path: Path) -> None:
    query_file = tmp_path / "queries" / "test_query.cypher"
    query_file.parent.mkdir(parents=True, exist_ok=True)
    query_file.write_text("RETURN 1;", encoding="utf-8")

    loader = CypherFileLoader(assets_root=tmp_path)
    query = loader.load_query("queries/test_query.cypher")

    assert query == "RETURN 1;"
