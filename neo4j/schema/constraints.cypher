CREATE CONSTRAINT document_document_id_unique IF NOT EXISTS
FOR (d:Document)
REQUIRE d.document_id IS UNIQUE;

CREATE CONSTRAINT requirement_code_unique IF NOT EXISTS
FOR (r:Requirement)
REQUIRE r.code IS UNIQUE;

CREATE CONSTRAINT check_check_id_unique IF NOT EXISTS
FOR (c:Check)
REQUIRE c.check_id IS UNIQUE;

CREATE CONSTRAINT report_report_id_unique IF NOT EXISTS
FOR (r:Report)
REQUIRE r.report_id IS UNIQUE;

CREATE CONSTRAINT correction_case_id_unique IF NOT EXISTS
FOR (c:CorrectionCase)
REQUIRE c.case_id IS UNIQUE;
