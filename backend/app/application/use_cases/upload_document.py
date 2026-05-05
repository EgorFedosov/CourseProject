from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, cast
from uuid import uuid4

from app.application.dto.document import UploadDocumentResponseDTO
from app.application.ports.document_repository import DocumentRecord, DocumentRepository
from app.application.ports.document_storage import DocumentStorage
from app.core.errors import AppError

_ALLOWED_FORMATS: tuple[str, ...] = ("pdf", "docx")
_ALLOWED_MIME_BY_FORMAT: dict[str, set[str]] = {
    "pdf": {
        "application/pdf",
        "application/x-pdf",
        "application/octet-stream",
    },
    "docx": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
        "application/octet-stream",
    },
}


def _sanitize_filename(filename: str) -> str:
    name = Path(filename).name.strip()
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", name)
    return safe.strip("._")


def _detect_format(filename: str) -> Literal["pdf", "docx"]:
    extension = Path(filename).suffix.lower().lstrip(".")
    if extension not in _ALLOWED_FORMATS:
        raise AppError(
            code="UNSUPPORTED_FILE_FORMAT",
            message="Only PDF and DOCX files are supported.",
            status_code=400,
            details={"allowed_formats": list(_ALLOWED_FORMATS)},
        )

    return cast(Literal["pdf", "docx"], extension)


@dataclass(frozen=True, slots=True)
class UploadDocumentUseCase:
    repository: DocumentRepository
    storage: DocumentStorage
    max_upload_bytes: int

    def execute(
        self,
        *,
        filename: str,
        content_type: str | None,
        content: bytes,
    ) -> UploadDocumentResponseDTO:
        sanitized_filename = _sanitize_filename(filename)
        if not sanitized_filename:
            raise AppError(
                code="INVALID_FILE_NAME",
                message="File name is invalid.",
                status_code=400,
            )

        file_format = _detect_format(sanitized_filename)
        allowed_mime = _ALLOWED_MIME_BY_FORMAT[file_format]
        normalized_content_type = (content_type or "").strip().lower()
        if normalized_content_type and normalized_content_type not in allowed_mime:
            raise AppError(
                code="UNSUPPORTED_FILE_MIME",
                message="File MIME type does not match file format.",
                status_code=400,
                details={
                    "format": file_format,
                    "mime_type": normalized_content_type,
                },
            )

        if not content:
            raise AppError(
                code="EMPTY_FILE",
                message="Uploaded file is empty.",
                status_code=400,
            )

        if len(content) > self.max_upload_bytes:
            raise AppError(
                code="FILE_TOO_LARGE",
                message="Uploaded file exceeds size limit.",
                status_code=413,
                details={
                    "max_upload_bytes": self.max_upload_bytes,
                    "received_bytes": len(content),
                },
            )

        document_id = str(uuid4())
        stored = self.storage.persist(
            document_id=document_id,
            filename=sanitized_filename,
            format=file_format,
            content=content,
        )

        try:
            self.repository.save(
                document=DocumentRecord(
                    document_id=stored.document_id,
                    filename=stored.filename,
                    format=stored.format,
                    status=stored.status,
                    storage_path=stored.storage_path,
                    sha256=stored.sha256,
                    size_bytes=stored.size_bytes,
                    uploaded_at=datetime.now(timezone.utc),
                )
            )
        except Exception:
            self.storage.delete(storage_path=stored.storage_path)
            raise

        return UploadDocumentResponseDTO(
            document_id=stored.document_id,
            filename=stored.filename,
            format=stored.format,
            status=stored.status,
        )
