MERGE (r1:Requirement {code: "REQ-INTRO-001"})
SET r1.title = "Introduction section is required",
    r1.category = "structure",
    r1.severity = "high",
    r1.condition_json = "{\"type\":\"required_section\",\"section\":\"introduction\",\"min_occurrences\":1}",
    r1.message_template = "Document must contain an Introduction section.",
    r1.recommendation = "Add an Introduction section and place it before the main content.",
    r1.version = "1.0.0",
    r1.is_active = true;

MERGE (r2:Requirement {code: "REQ-CONCLUSION-001"})
SET r2.title = "Conclusion section is required",
    r2.category = "structure",
    r2.severity = "high",
    r2.condition_json = "{\"type\":\"required_section\",\"section\":\"conclusion\",\"min_occurrences\":1}",
    r2.message_template = "Document must contain a Conclusion section.",
    r2.recommendation = "Add a Conclusion section with final findings.",
    r2.version = "1.0.0",
    r2.is_active = true;

MERGE (r3:Requirement {code: "REQ-FONT-001"})
SET r3.title = "Primary font must be Times New Roman 14",
    r3.category = "formatting",
    r3.severity = "medium",
    r3.condition_json = "{\"type\":\"font_rule\",\"font_family\":\"Times New Roman\",\"font_size\":14}",
    r3.message_template = "Primary document font must be Times New Roman, size 14.",
    r3.recommendation = "Align body text style with the required typography settings.",
    r3.version = "1.0.0",
    r3.is_active = true;

MATCH (type:DocumentType {code: "COURSE_PROJECT_NOTE"})
MATCH (semester:Semester {number: 4})
MATCH (r:Requirement)
WHERE r.code IN ["REQ-INTRO-001", "REQ-CONCLUSION-001", "REQ-FONT-001"]
MERGE (r)-[:APPLIES_TO_TYPE]->(type)
MERGE (r)-[:APPLIES_TO_SEMESTER]->(semester);
