from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from app.application.ports.document_storage import DocumentStorage, StoredDocument


@dataclass(frozen=True, slots=True)
class LocalDocumentStorage(DocumentStorage):
    root: Path

    def __post_init__(self) -> None:
        self.root.mkdir(parents=True, exist_ok=True)

    def persist(
        self,
        *,
        document_id: str,
        filename: str,
        format: Literal["pdf", "docx"],
        content: bytes,
    ) -> StoredDocument:
        target_path = self.root / f"{document_id}_{filename}"
        target_path.write_bytes(content)

        return StoredDocument(
            document_id=document_id,
            filename=filename,
            format=format,
            status="UPLOADED",
            storage_path=str(target_path.resolve()),
            sha256=hashlib.sha256(content).hexdigest(),
            size_bytes=len(content),
        )

    def delete(self, *, storage_path: str) -> None:
        path = Path(storage_path)
        if path.exists():
            path.unlink()
