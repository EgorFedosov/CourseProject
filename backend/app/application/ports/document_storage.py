from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol


@dataclass(frozen=True, slots=True)
class StoredDocument:
    document_id: str
    filename: str
    format: Literal["pdf", "docx"]
    status: Literal["UPLOADED"]
    storage_path: str
    sha256: str
    size_bytes: int


class DocumentStorage(Protocol):
    def persist(
        self,
        *,
        document_id: str,
        filename: str,
        format: Literal["pdf", "docx"],
        content: bytes,
    ) -> StoredDocument: ...

    def delete(self, *, storage_path: str) -> None: ...
