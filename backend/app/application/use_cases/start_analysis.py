from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

from app.application.dto.analysis import (
    StartAnalysisRequestDTO,
    StartAnalysisResponseDTO,
)
from app.application.ports.analysis_pipeline import AnalysisPipeline
from app.application.ports.analysis_repository import AnalysisRepository, ReportSnapshot
from app.core.errors import AppError
from app.domain.value_objects.analysis_status import AnalysisStatus, progress_for_status


@dataclass(frozen=True, slots=True)
class StartAnalysisUseCase:
    repository: AnalysisRepository
    pipeline: AnalysisPipeline

    def execute(self, *, request: StartAnalysisRequestDTO) -> StartAnalysisResponseDTO:
        active_check_id = self.repository.find_active_check_for_document(
            document_id=request.document_id
        )
        if active_check_id is not None:
            raise AppError(
                code="ANALYSIS_ALREADY_RUNNING",
                message="An active analysis already exists for this document.",
                status_code=409,
                details={"check_id": active_check_id},
            )

        check_id = str(uuid4())
        self.repository.create_check(
            check_id=check_id,
            document_id=request.document_id,
            requested_by=request.requested_by,
            started_at=datetime.now(timezone.utc),
            status=AnalysisStatus.ANALYZING,
            progress=progress_for_status(AnalysisStatus.ANALYZING),
        )

        return StartAnalysisResponseDTO(
            check_id=check_id, status=AnalysisStatus.ANALYZING
        )

    def run_pipeline(self, *, check_id: str, document_id: str) -> None:
        try:
            parsed_document = self.pipeline.parse(document_id=document_id)

            document_type = self.pipeline.detect_document_type(
                parsed_document=parsed_document
            )
            self.repository.update_check_status(
                check_id=check_id,
                status=AnalysisStatus.TYPE_DETERMINED,
                progress=progress_for_status(AnalysisStatus.TYPE_DETERMINED),
                document_type=document_type,
            )

            semester = self.pipeline.detect_semester(
                parsed_document=parsed_document,
                document_type=document_type,
            )
            self.repository.update_check_status(
                check_id=check_id,
                status=AnalysisStatus.SEMESTER_DETERMINED,
                progress=progress_for_status(AnalysisStatus.SEMESTER_DETERMINED),
                document_type=document_type,
                semester=semester,
            )

            requirements = self.pipeline.select_rules(
                document_type=document_type,
                semester=semester,
            )
            self.repository.save_used_rule_codes(
                check_id=check_id,
                rule_codes=[requirement.code for requirement in requirements],
            )

            violations = self.pipeline.check_requirements(
                parsed_document=parsed_document,
                requirements=requirements,
            )
            self.repository.update_check_status(
                check_id=check_id,
                status=AnalysisStatus.REQUIREMENTS_CHECKED,
                progress=progress_for_status(AnalysisStatus.REQUIREMENTS_CHECKED),
                document_type=document_type,
                semester=semester,
            )

            built_report = self.pipeline.build_report(
                requirements=requirements,
                violations=violations,
            )
            self.repository.save_report(
                report=ReportSnapshot(
                    check_id=check_id,
                    report_id=str(uuid4()),
                    document_type=document_type,
                    semester=semester,
                    rules=[requirement.code for requirement in requirements],
                    violations=violations,
                    recommendations=built_report.recommendations,
                    overall_status=built_report.overall_status,
                    summary=built_report.summary,
                )
            )

            self.repository.update_check_status(
                check_id=check_id,
                status=AnalysisStatus.REPORT_READY,
                progress=progress_for_status(AnalysisStatus.REPORT_READY),
                document_type=document_type,
                semester=semester,
                finished_at=datetime.now(timezone.utc),
            )
        except Exception as exc:  # noqa: BLE001
            self.repository.update_check_status(
                check_id=check_id,
                status=AnalysisStatus.ERROR,
                progress=progress_for_status(AnalysisStatus.ERROR),
                error=str(exc),
                finished_at=datetime.now(timezone.utc),
            )
