MATCH (entity:CorrectionCase)
WHERE ($document_type_code IS NULL OR entity.final_type = $document_type_code OR entity.predicted_type = $document_type_code)
  AND ($semester_number IS NULL OR entity.final_semester = $semester_number OR entity.predicted_semester = $semester_number)
RETURN
    entity.case_id AS case_id,
    entity.doc_features_json AS doc_features_json,
    entity.predicted_type AS predicted_type,
    entity.final_type AS final_type,
    entity.predicted_semester AS predicted_semester,
    entity.final_semester AS final_semester,
    entity.predicted_violations_json AS predicted_violations_json,
    entity.final_violations_json AS final_violations_json,
    entity.teacher_comment AS teacher_comment,
    entity.created_at AS created_at
ORDER BY entity.created_at DESC
LIMIT $limit;
