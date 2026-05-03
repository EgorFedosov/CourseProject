MATCH (check:Check {check_id: $check_id})
UNWIND $violations AS violation
MERGE (entity:Violation {violation_id: violation.violation_id})
SET entity.code = violation.code,
    entity.message = violation.message,
    entity.severity = violation.severity,
    entity.evidence_json = violation.evidence_json,
    entity.confidence = violation.confidence
MERGE (check)-[:FOUND]->(entity)
WITH entity, violation
MATCH (requirement:Requirement {code: violation.requirement_code})
MERGE (entity)-[:VIOLATES]->(requirement);
