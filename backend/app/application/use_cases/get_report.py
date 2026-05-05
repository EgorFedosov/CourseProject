from dataclasses import dataclass

from app.application.dto.report import ReportResponseDTO, ReportViolationDTO
from app.application.ports.analysis_repository import AnalysisRepository
from app.core.errors import AppError
from app.domain.value_objects.analysis_status import AnalysisStatus


@dataclass(frozen=True, slots=True)
class GetReportUseCase:
    repository: AnalysisRepository

    def execute(self, *, check_id: str) -> ReportResponseDTO:
        status = self.repository.get_status(check_id=check_id)
        if status is None:
            raise AppError(
                code="ANALYSIS_NOT_FOUND",
                message="Analysis was not found.",
                status_code=404,
            )

        if status.status is not AnalysisStatus.REPORT_READY:
            raise AppError(
                code="REPORT_NOT_READY",
                message="Report is not ready yet.",
                status_code=409,
                details={"status": status.status.value},
            )

        report = self.repository.get_report(check_id=check_id)
        if report is None:
            raise AppError(
                code="REPORT_NOT_FOUND",
                message="Report was not found.",
                status_code=404,
            )

        return ReportResponseDTO(
            check_id=report.check_id,
            type=report.document_type,
            semester=report.semester,
            rules=report.rules,
            violations=[
                ReportViolationDTO(
                    violation_id=violation.violation_id,
                    code=violation.code,
                    message=violation.message,
                    severity=violation.severity,
                    confidence=violation.confidence,
                    evidence=violation.evidence_json,
                )
                for violation in report.violations
            ],
            recommendations=report.recommendations,
            overall_status=report.overall_status,
        )
