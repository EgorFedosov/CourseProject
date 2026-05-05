MATCH (check:Check {check_id: $check_id})
SET check.status = $status,
    check.progress = $progress,
    check.error = $error,
    check.document_type_code = COALESCE($document_type, check.document_type_code),
    check.semester_number = COALESCE($semester, check.semester_number),
    check.finished_at = COALESCE($finished_at, check.finished_at)
RETURN check.check_id AS check_id;
