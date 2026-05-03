MERGE (s2:Semester {number: 2})
SET s2.title = "Semester 2",
    s2.markers_json = "[\"semester 2\", \"s2\"]";

MERGE (s4:Semester {number: 4})
SET s4.title = "Semester 4",
    s4.markers_json = "[\"kp4\", \"semester 4\", \"course project\"]";

MERGE (s6:Semester {number: 6})
SET s6.title = "Semester 6",
    s6.markers_json = "[\"semester 6\", \"advanced project\"]";
