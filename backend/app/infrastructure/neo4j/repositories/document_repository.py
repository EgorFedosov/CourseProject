from __future__ import annotations

from dataclasses import dataclass

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
