MERGE (check:Check {check_id: $check_id})
ON CREATE SET check.started_at = $started_at
SET check.finished_at = $finished_at,
    check.status = $status
WITH check
MATCH (document:Document {document_id: $document_id})
MERGE (check)-[:FOR_DOCUMENT]->(document)
WITH check, CASE
    WHEN $used_requirement_codes = [] THEN [NULL]
    ELSE $used_requirement_codes
END AS req_codes
UNWIND req_codes AS requirement_code
WITH check, requirement_code
WHERE requirement_code IS NOT NULL
MATCH (requirement:Requirement {code: requirement_code})
MERGE (check)-[:USED_REQUIREMENT]->(requirement);
