MATCH (document:Document {document_id: $document_id})
MERGE (check:Check {check_id: $check_id})
ON CREATE SET check.started_at = $started_at
SET check.requested_by = $requested_by,
    check.status = $status,
    check.progress = $progress,
    check.error = NULL,
    check.finished_at = NULL
MERGE (check)-[:FOR_DOCUMENT]->(document)
RETURN check.check_id AS check_id;
