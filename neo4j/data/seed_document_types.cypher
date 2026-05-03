MERGE (dt1:DocumentType {code: "COURSE_PROJECT_NOTE"})
SET dt1.name = "Course project note",
    dt1.description = "Explanatory note for course project";

MERGE (dt2:DocumentType {code: "COURSE_WORK_REPORT"})
SET dt2.name = "Course work report",
    dt2.description = "Report document for course work";

MERGE (dt3:DocumentType {code: "LAB_REPORT"})
SET dt3.name = "Lab report",
    dt3.description = "Standard laboratory report document";
