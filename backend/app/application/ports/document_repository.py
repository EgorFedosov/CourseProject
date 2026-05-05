from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal, Protocol


@dataclass(frozen=True, slots=True)
class DocumentRecord:
    document_id: str
    filename: str
    format: Literal["pdf", "docx"]
    status: Literal["UPLOADED"]
    storage_path: str
    sha256: str
    size_bytes: int
    uploaded_at: datetime


class DocumentRepository(Protocol):
    def save(self, *, document: DocumentRecord) -> None: ...
