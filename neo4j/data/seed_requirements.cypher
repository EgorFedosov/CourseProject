// -------------------------------------------------------
// COURSE_PROJECT_NOTE / Semester 4
// -------------------------------------------------------
MERGE (r_cp_intro:Requirement {code: "REQ-INTRO-001"})
SET r_cp_intro.title = "Introduction section is required",
    r_cp_intro.category = "structure",
    r_cp_intro.severity = "high",
    r_cp_intro.condition_json = "{\"type\":\"required_section\",\"section\":\"introduction\",\"min_occurrences\":1}",
    r_cp_intro.message_template = "Document must contain an Introduction section.",
    r_cp_intro.recommendation = "Add an Introduction section and place it before the main content.",
    r_cp_intro.version = "1.1.0",
    r_cp_intro.is_active = true;

MERGE (r_cp_conclusion:Requirement {code: "REQ-CONCLUSION-001"})
SET r_cp_conclusion.title = "Conclusion section is required",
    r_cp_conclusion.category = "structure",
    r_cp_conclusion.severity = "high",
    r_cp_conclusion.condition_json = "{\"type\":\"required_section\",\"section\":\"conclusion\",\"min_occurrences\":1}",
    r_cp_conclusion.message_template = "Document must contain a Conclusion section.",
    r_cp_conclusion.recommendation = "Add a Conclusion section with final findings.",
    r_cp_conclusion.version = "1.1.0",
    r_cp_conclusion.is_active = true;

MERGE (r_cp_abstract:Requirement {code: "REQ-ABSTRACT-001"})
SET r_cp_abstract.title = "Abstract section is required",
    r_cp_abstract.category = "structure",
    r_cp_abstract.severity = "medium",
    r_cp_abstract.condition_json = "{\"type\":\"required_section\",\"section\":\"abstract\",\"min_occurrences\":1}",
    r_cp_abstract.message_template = "Document must contain an Abstract section.",
    r_cp_abstract.recommendation = "Add a concise Abstract section before Introduction.",
    r_cp_abstract.version = "1.0.0",
    r_cp_abstract.is_active = true;

MERGE (r_cp_methodology:Requirement {code: "REQ-METHODOLOGY-001"})
SET r_cp_methodology.title = "Methodology section is required",
    r_cp_methodology.category = "structure",
    r_cp_methodology.severity = "medium",
    r_cp_methodology.condition_json = "{\"type\":\"required_section\",\"section\":\"methodology\",\"min_occurrences\":1}",
    r_cp_methodology.message_template = "Document must contain a Methodology section.",
    r_cp_methodology.recommendation = "Describe methods, tools and evaluation criteria in Methodology.",
    r_cp_methodology.version = "1.0.0",
    r_cp_methodology.is_active = true;

MERGE (r_cp_results:Requirement {code: "REQ-RESULTS-001"})
SET r_cp_results.title = "Results section is required",
    r_cp_results.category = "structure",
    r_cp_results.severity = "medium",
    r_cp_results.condition_json = "{\"type\":\"required_section\",\"section\":\"results\",\"min_occurrences\":1}",
    r_cp_results.message_template = "Document must contain a Results section.",
    r_cp_results.recommendation = "Add measurable outcomes and validation results.",
    r_cp_results.version = "1.0.0",
    r_cp_results.is_active = true;

MERGE (r_cp_references:Requirement {code: "REQ-REFERENCES-001"})
SET r_cp_references.title = "References section is required",
    r_cp_references.category = "structure",
    r_cp_references.severity = "medium",
    r_cp_references.condition_json = "{\"type\":\"required_section\",\"section\":\"references\",\"min_occurrences\":1}",
    r_cp_references.message_template = "Document must contain a References section.",
    r_cp_references.recommendation = "List all external sources in the References section.",
    r_cp_references.version = "1.0.0",
    r_cp_references.is_active = true;

MERGE (r_cp_font:Requirement {code: "REQ-FONT-001"})
SET r_cp_font.title = "Primary font must be Times New Roman 14",
    r_cp_font.category = "formatting",
    r_cp_font.severity = "medium",
    r_cp_font.condition_json = "{\"type\":\"font_rule\",\"font_family\":\"Times New Roman\",\"font_size\":14}",
    r_cp_font.message_template = "Primary document font must be Times New Roman, size 14.",
    r_cp_font.recommendation = "Align body text style with the required typography settings.",
    r_cp_font.version = "1.1.0",
    r_cp_font.is_active = true;

MATCH (cp_type:DocumentType {code: "COURSE_PROJECT_NOTE"})
MATCH (semester4:Semester {number: 4})
MATCH (r_cp:Requirement)
WHERE r_cp.code IN [
    "REQ-INTRO-001",
    "REQ-CONCLUSION-001",
    "REQ-ABSTRACT-001",
    "REQ-METHODOLOGY-001",
    "REQ-RESULTS-001",
    "REQ-REFERENCES-001",
    "REQ-FONT-001"
]
MERGE (r_cp)-[:APPLIES_TO_TYPE]->(cp_type)
MERGE (r_cp)-[:APPLIES_TO_SEMESTER]->(semester4);

// -------------------------------------------------------
// LAB_REPORT / Semester 2
// -------------------------------------------------------
MERGE (r_lab_intro:Requirement {code: "REQ-LAB-INTRO-001"})
SET r_lab_intro.title = "Lab report must include Introduction",
    r_lab_intro.category = "structure",
    r_lab_intro.severity = "high",
    r_lab_intro.condition_json = "{\"type\":\"required_section\",\"section\":\"introduction\",\"min_occurrences\":1}",
    r_lab_intro.message_template = "Lab report must contain an Introduction section.",
    r_lab_intro.recommendation = "Describe the objective and context of the experiment.",
    r_lab_intro.version = "1.0.0",
    r_lab_intro.is_active = true;

MERGE (r_lab_equipment:Requirement {code: "REQ-LAB-EQUIPMENT-001"})
SET r_lab_equipment.title = "Lab report must include Equipment and Setup",
    r_lab_equipment.category = "structure",
    r_lab_equipment.severity = "high",
    r_lab_equipment.condition_json = "{\"type\":\"required_section\",\"section\":\"equipment and setup\",\"min_occurrences\":1}",
    r_lab_equipment.message_template = "Lab report must contain an Equipment and Setup section.",
    r_lab_equipment.recommendation = "Add hardware, software and setup details in a dedicated section.",
    r_lab_equipment.version = "1.0.0",
    r_lab_equipment.is_active = true;

MERGE (r_lab_results:Requirement {code: "REQ-LAB-RESULTS-001"})
SET r_lab_results.title = "Lab report must include Results",
    r_lab_results.category = "structure",
    r_lab_results.severity = "high",
    r_lab_results.condition_json = "{\"type\":\"required_section\",\"section\":\"results\",\"min_occurrences\":1}",
    r_lab_results.message_template = "Lab report must contain a Results section.",
    r_lab_results.recommendation = "Provide measured values, observations and calculations.",
    r_lab_results.version = "1.0.0",
    r_lab_results.is_active = true;

MERGE (r_lab_conclusion:Requirement {code: "REQ-LAB-CONCLUSION-001"})
SET r_lab_conclusion.title = "Lab report must include Conclusion",
    r_lab_conclusion.category = "structure",
    r_lab_conclusion.severity = "high",
    r_lab_conclusion.condition_json = "{\"type\":\"required_section\",\"section\":\"conclusion\",\"min_occurrences\":1}",
    r_lab_conclusion.message_template = "Lab report must contain a Conclusion section.",
    r_lab_conclusion.recommendation = "Summarize experimental findings and compare with expected behavior.",
    r_lab_conclusion.version = "1.0.0",
    r_lab_conclusion.is_active = true;

MERGE (r_lab_font:Requirement {code: "REQ-LAB-FONT-001"})
SET r_lab_font.title = "Lab report font must be Helvetica 12",
    r_lab_font.category = "formatting",
    r_lab_font.severity = "medium",
    r_lab_font.condition_json = "{\"type\":\"font_rule\",\"font_family\":\"Helvetica\",\"font_size\":12}",
    r_lab_font.message_template = "Lab report primary font must be Helvetica, size 12.",
    r_lab_font.recommendation = "Set body text to Helvetica 12 for consistency.",
    r_lab_font.version = "1.0.0",
    r_lab_font.is_active = true;

MATCH (lab_type:DocumentType {code: "LAB_REPORT"})
MATCH (semester2:Semester {number: 2})
MATCH (r_lab:Requirement)
WHERE r_lab.code IN [
    "REQ-LAB-INTRO-001",
    "REQ-LAB-EQUIPMENT-001",
    "REQ-LAB-RESULTS-001",
    "REQ-LAB-CONCLUSION-001",
    "REQ-LAB-FONT-001"
]
MERGE (r_lab)-[:APPLIES_TO_TYPE]->(lab_type)
MERGE (r_lab)-[:APPLIES_TO_SEMESTER]->(semester2);

// -------------------------------------------------------
// COURSE_WORK_REPORT / Semester 6
// -------------------------------------------------------
MERGE (r_cw_intro:Requirement {code: "REQ-CW-INTRO-001"})
SET r_cw_intro.title = "Course work report must include Introduction",
    r_cw_intro.category = "structure",
    r_cw_intro.severity = "high",
    r_cw_intro.condition_json = "{\"type\":\"required_section\",\"section\":\"introduction\",\"min_occurrences\":1}",
    r_cw_intro.message_template = "Course work report must contain an Introduction section.",
    r_cw_intro.recommendation = "Add background, goal and scope to the Introduction section.",
    r_cw_intro.version = "1.0.0",
    r_cw_intro.is_active = true;

MERGE (r_cw_analysis:Requirement {code: "REQ-CW-ANALYSIS-001"})
SET r_cw_analysis.title = "Course work report must include Analysis",
    r_cw_analysis.category = "structure",
    r_cw_analysis.severity = "high",
    r_cw_analysis.condition_json = "{\"type\":\"required_section\",\"section\":\"analysis\",\"min_occurrences\":1}",
    r_cw_analysis.message_template = "Course work report must contain an Analysis section.",
    r_cw_analysis.recommendation = "Provide analytical reasoning, calculations and intermediate conclusions.",
    r_cw_analysis.version = "1.0.0",
    r_cw_analysis.is_active = true;

MERGE (r_cw_conclusion:Requirement {code: "REQ-CW-CONCLUSION-001"})
SET r_cw_conclusion.title = "Course work report must include Conclusion",
    r_cw_conclusion.category = "structure",
    r_cw_conclusion.severity = "high",
    r_cw_conclusion.condition_json = "{\"type\":\"required_section\",\"section\":\"conclusion\",\"min_occurrences\":1}",
    r_cw_conclusion.message_template = "Course work report must contain a Conclusion section.",
    r_cw_conclusion.recommendation = "Finish report with final findings and limitations.",
    r_cw_conclusion.version = "1.0.0",
    r_cw_conclusion.is_active = true;

MERGE (r_cw_references:Requirement {code: "REQ-CW-REFERENCES-001"})
SET r_cw_references.title = "Course work report must include References",
    r_cw_references.category = "structure",
    r_cw_references.severity = "medium",
    r_cw_references.condition_json = "{\"type\":\"required_section\",\"section\":\"references\",\"min_occurrences\":1}",
    r_cw_references.message_template = "Course work report must contain a References section.",
    r_cw_references.recommendation = "Add bibliography with all cited sources.",
    r_cw_references.version = "1.0.0",
    r_cw_references.is_active = true;

MERGE (r_cw_font:Requirement {code: "REQ-CW-FONT-001"})
SET r_cw_font.title = "Course work report font must be Calibri 12",
    r_cw_font.category = "formatting",
    r_cw_font.severity = "medium",
    r_cw_font.condition_json = "{\"type\":\"font_rule\",\"font_family\":\"Calibri\",\"font_size\":12}",
    r_cw_font.message_template = "Course work report primary font must be Calibri, size 12.",
    r_cw_font.recommendation = "Use Calibri 12 as the dominant body text style.",
    r_cw_font.version = "1.0.0",
    r_cw_font.is_active = true;

MATCH (cw_type:DocumentType {code: "COURSE_WORK_REPORT"})
MATCH (semester6:Semester {number: 6})
MATCH (r_cw:Requirement)
WHERE r_cw.code IN [
    "REQ-CW-INTRO-001",
    "REQ-CW-ANALYSIS-001",
    "REQ-CW-CONCLUSION-001",
    "REQ-CW-REFERENCES-001",
    "REQ-CW-FONT-001"
]
MERGE (r_cw)-[:APPLIES_TO_TYPE]->(cw_type)
MERGE (r_cw)-[:APPLIES_TO_SEMESTER]->(semester6);
