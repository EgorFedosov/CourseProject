MATCH (check:Check)-[:FOR_DOCUMENT]->(:Document {document_id: $document_id})
WHERE check.status IN $active_statuses
RETURN check.check_id AS check_id
ORDER BY check.started_at DESC
LIMIT 1;
