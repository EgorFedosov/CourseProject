MATCH (document:Document {document_id: $document_id})
RETURN
    document.document_id AS document_id,
    document.filename AS filename,
    document.format AS format,
    document.status AS status,
    document.storage_path AS storage_path,
    document.sha256 AS sha256,
    document.size_bytes AS size_bytes,
    document.uploaded_at AS uploaded_at;
