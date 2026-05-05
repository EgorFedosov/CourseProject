MERGE (document:Document {document_id: $document_id})
SET document.filename = $filename,
    document.format = $format,
    document.status = $status,
    document.storage_path = $storage_path,
    document.sha256 = $sha256,
    document.size_bytes = $size_bytes,
    document.uploaded_at = $uploaded_at;
