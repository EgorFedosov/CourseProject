from __future__ import annotations

from pathlib import Path


def split_cypher_statements(content: str) -> list[str]:
    statements: list[str] = []
    current_lines: list[str] = []

    for line in content.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("//"):
            continue

        current_lines.append(line)
        if stripped.endswith(";"):
            statement = "\n".join(current_lines).strip().rstrip(";").strip()
            if statement:
                statements.append(statement)
            current_lines = []

    if current_lines:
        statement = "\n".join(current_lines).strip().rstrip(";").strip()
        if statement:
            statements.append(statement)

    return statements


class CypherFileLoader:
    def __init__(self, assets_root: Path) -> None:
        self._assets_root = assets_root

    def load_query(self, relative_path: str) -> str:
        path = self._assets_root / relative_path
        return path.read_text(encoding="utf-8")

    def load_statements(self, relative_path: str) -> list[str]:
        return split_cypher_statements(self.load_query(relative_path))
