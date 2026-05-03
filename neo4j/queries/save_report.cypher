MATCH (check:Check {check_id: $check_id})
MERGE (report:Report {report_id: $report_id})
SET report.overall_status = $overall_status,
    report.summary = $summary,
    report.generated_at = $generated_at,
    report.path = $path
MERGE (report)-[:FOR_CHECK]->(check);
