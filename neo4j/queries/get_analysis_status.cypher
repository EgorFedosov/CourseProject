MATCH (check:Check {check_id: $check_id})
RETURN
    check.check_id AS check_id,
    check.status AS status,
    check.progress AS progress,
    check.error AS error;
