CREATE INDEX document_type_code_index IF NOT EXISTS
FOR (dt:DocumentType)
ON (dt.code);

CREATE INDEX semester_number_index IF NOT EXISTS
FOR (s:Semester)
ON (s.number);

CREATE INDEX requirement_active_index IF NOT EXISTS
FOR (r:Requirement)
ON (r.is_active);

CREATE INDEX violation_code_index IF NOT EXISTS
FOR (v:Violation)
ON (v.code);
