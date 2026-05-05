from __future__ import annotations

from enum import Enum


class AnalysisStatus(str, Enum):
    ANALYZING = "ANALYZING"
    TYPE_DETERMINED = "TYPE_DETERMINED"
    SEMESTER_DETERMINED = "SEMESTER_DETERMINED"
    REQUIREMENTS_CHECKED = "REQUIREMENTS_CHECKED"
    REPORT_READY = "REPORT_READY"
    ERROR = "ERROR"


_PROGRESS_MAP: dict[AnalysisStatus, int] = {
    AnalysisStatus.ANALYZING: 10,
    AnalysisStatus.TYPE_DETERMINED: 35,
    AnalysisStatus.SEMESTER_DETERMINED: 55,
    AnalysisStatus.REQUIREMENTS_CHECKED: 85,
    AnalysisStatus.REPORT_READY: 100,
    AnalysisStatus.ERROR: 100,
}


TERMINAL_ANALYSIS_STATUSES: frozenset[AnalysisStatus] = frozenset(
    {
        AnalysisStatus.REPORT_READY,
        AnalysisStatus.ERROR,
    }
)


def progress_for_status(status: AnalysisStatus) -> int:
    return _PROGRESS_MAP[status]
