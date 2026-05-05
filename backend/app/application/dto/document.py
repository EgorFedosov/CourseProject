from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class UploadDocumentResponseDTO(BaseModel):
    document_id: str = Field(..., min_length=1)
    filename: str = Field(..., min_length=1)
    format: Literal["pdf", "docx"]
    status: Literal["UPLOADED"]
