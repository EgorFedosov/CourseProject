from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal, cast

from app.application.ports.document_repository import DocumentRecord, DocumentRepository
from app.infrastructure.neo4j.client import Neo4jClient
from app.infrastructure.neo4j.cypher import CypherFileLoader


@dataclass(frozen=True, slots=True)
class Neo4jDocumentRepository(DocumentRepository):
    client: Neo4jClient
    cypher_loader: CypherFileLoader

    def save(self, *, document: DocumentRecord) -> None:
        query = self.cypher_loader.load_query("queries/save_document.cypher")

        with self.client.get_session() as session:
            session.run(
                query,
                document_id=document.document_id,
                filename=document.filename,
                format=document.format,
                status=document.status,
                storage_path=document.storage_path,
                sha256=document.sha256,
                size_bytes=document.size_bytes,
                uploaded_at=document.uploaded_at.isoformat(),
            ).consume()

    def get_by_id(self, *, document_id: str) -> DocumentRecord | None:
        query = self.cypher_loader.load_query("queries/get_document_by_id.cypher")

        with self.client.get_session() as session:
            record = session.run(query, document_id=document_id).single()

        if record is None:
            return None

        uploaded_at_raw = record.get("uploaded_at")
        uploaded_at = datetime.now(timezone.utc)
        if isinstance(uploaded_at_raw, str):
            try:
                uploaded_at = datetime.fromisoformat(
                    uploaded_at_raw.replace("Z", "+00:00")
                )
            except ValueError:
                uploaded_at = datetime.now(timezone.utc)

        document_format = str(record["format"]).lower()
        if document_format not in {"pdf", "docx"}:
            return None

        return DocumentRecord(
            document_id=str(record["document_id"]),
            filename=str(record["filename"]),
            format=cast(Literal["pdf", "docx"], document_format),
            status="UPLOADED",
            storage_path=str(record["storage_path"]),
            sha256=str(record["sha256"]),
            size_bytes=int(record["size_bytes"]),
            uploaded_at=uploaded_at,
        )
