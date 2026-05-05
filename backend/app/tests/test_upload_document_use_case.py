from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import pytest

from app.application.ports.document_repository import DocumentRecord
from app.application.ports.document_storage import StoredDocument
from app.application.use_cases.upload_document import UploadDocumentUseCase
from app.core.errors import AppError


@dataclass
class _InMemoryStorage:
    deleted_paths: list[str]

    def persist(
        self,
        *,
        document_id: str,
        filename: str,
        format: Literal["pdf", "docx"],
        content: bytes,
    ) -> StoredDocument:
        return StoredDocument(
            document_id=document_id,
            filename=filename,
            format=format,
            status="UPLOADED",
            storage_path=f"/tmp/{document_id}_{filename}",
            sha256="hash",
            size_bytes=len(content),
        )

    def delete(self, *, storage_path: str) -> None:
        self.deleted_paths.append(storage_path)


@dataclass
class _InMemoryRepository:
    should_fail: bool = False
    saved: list[DocumentRecord] | None = None

    def save(self, *, document: DocumentRecord) -> None:
        if self.should_fail:
            raise RuntimeError("db unavailable")
        if self.saved is None:
            self.saved = []
        self.saved.append(document)


def test_upload_document_use_case_saves_document_record() -> None:
    storage = _InMemoryStorage(deleted_paths=[])
    repository = _InMemoryRepository(saved=[])
    use_case = UploadDocumentUseCase(
        repository=repository,
        storage=storage,
        max_upload_bytes=100,
    )

    response = use_case.execute(
        filename="report.pdf",
        content_type="application/pdf",
        content=b"test-content",
    )

    assert response.status == "UPLOADED"
    assert response.format == "pdf"
    assert response.filename == "report.pdf"
    assert repository.saved is not None
    assert len(repository.saved) == 1
    assert repository.saved[0].filename == "report.pdf"


def test_upload_document_use_case_rejects_invalid_extension() -> None:
    use_case = UploadDocumentUseCase(
        repository=_InMemoryRepository(saved=[]),
        storage=_InMemoryStorage(deleted_paths=[]),
        max_upload_bytes=100,
    )

    with pytest.raises(AppError) as exc:
        use_case.execute(
            filename="report.txt",
            content_type="text/plain",
            content=b"test-content",
        )

    assert exc.value.code == "UNSUPPORTED_FILE_FORMAT"


def test_upload_document_use_case_rejects_file_too_large() -> None:
    use_case = UploadDocumentUseCase(
        repository=_InMemoryRepository(saved=[]),
        storage=_InMemoryStorage(deleted_paths=[]),
        max_upload_bytes=4,
    )

    with pytest.raises(AppError) as exc:
        use_case.execute(
            filename="report.pdf",
            content_type="application/pdf",
            content=b"12345",
        )

    assert exc.value.code == "FILE_TOO_LARGE"


def test_upload_document_use_case_cleans_file_if_db_save_fails() -> None:
    storage = _InMemoryStorage(deleted_paths=[])
    use_case = UploadDocumentUseCase(
        repository=_InMemoryRepository(should_fail=True, saved=[]),
        storage=storage,
        max_upload_bytes=100,
    )

    with pytest.raises(RuntimeError):
        use_case.execute(
            filename="report.pdf",
            content_type="application/pdf",
            content=b"test-content",
        )

    assert len(storage.deleted_paths) == 1
