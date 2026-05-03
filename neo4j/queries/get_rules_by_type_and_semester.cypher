MATCH (r:Requirement {is_active: true})-[:APPLIES_TO_TYPE]->(:DocumentType {code: $document_type_code})
MATCH (r)-[:APPLIES_TO_SEMESTER]->(:Semester {number: $semester_number})
RETURN
    r.code AS code,
    r.title AS title,
    r.category AS category,
    r.severity AS severity,
    r.condition_json AS condition_json,
    r.message_template AS message_template,
    r.recommendation AS recommendation,
    r.version AS version,
    r.is_active AS is_active
ORDER BY r.code;
