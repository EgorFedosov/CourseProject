MATCH (check:Check {check_id: $check_id})
OPTIONAL MATCH (report:Report)-[:FOR_CHECK]->(check)
RETURN
    check.check_id AS check_id,
    report.report_id AS report_id,
    COALESCE(report.document_type_code, check.document_type_code) AS document_type,
    COALESCE(report.semester_number, check.semester_number) AS semester,
    report.applied_rules_json AS rules_json,
    report.violations_json AS violations_json,
    report.recommendations_json AS recommendations_json,
    report.overall_status AS overall_status,
    report.summary AS summary;
