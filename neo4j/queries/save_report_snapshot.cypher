MATCH (check:Check {check_id: $check_id})
MERGE (report:Report {report_id: $report_id})
SET report.document_type_code = $document_type,
    report.semester_number = $semester,
    report.applied_rules_json = $rules_json,
    report.violations_json = $violations_json,
    report.recommendations_json = $recommendations_json,
    report.overall_status = $overall_status,
    report.summary = $summary,
    report.generated_at = datetime(),
    report.path = ""
MERGE (report)-[:FOR_CHECK]->(check);
