MATCH (check:Check {check_id: $check_id})
OPTIONAL MATCH (check)-[rel:USED_REQUIREMENT]->(:Requirement)
DELETE rel
WITH check
UNWIND $rule_codes AS rule_code
MATCH (requirement:Requirement {code: rule_code})
MERGE (check)-[:USED_REQUIREMENT]->(requirement);
