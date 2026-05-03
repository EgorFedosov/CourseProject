MERGE (entity:CorrectionCase {case_id: $case_id})
SET entity.doc_features_json = $doc_features_json,
    entity.predicted_type = $predicted_type,
    entity.final_type = $final_type,
    entity.predicted_semester = $predicted_semester,
    entity.final_semester = $final_semester,
    entity.predicted_violations_json = $predicted_violations_json,
    entity.final_violations_json = $final_violations_json,
    entity.teacher_comment = $teacher_comment,
    entity.created_at = $created_at
WITH entity
OPTIONAL MATCH (type:DocumentType {code: $final_type})
FOREACH (_ IN CASE WHEN type IS NULL THEN [] ELSE [1] END |
    MERGE (entity)-[:RELATES_TO_TYPE]->(type)
)
WITH entity
OPTIONAL MATCH (semester:Semester {number: $final_semester})
FOREACH (_ IN CASE WHEN semester IS NULL THEN [] ELSE [1] END |
    MERGE (entity)-[:RELATES_TO_SEMESTER]->(semester)
);
