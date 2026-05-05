from dataclasses import dataclass

from app.application.dto.analysis import AnalysisStatusResponseDTO
from app.application.ports.analysis_repository import AnalysisRepository
from app.core.errors import AppError


@dataclass(frozen=True, slots=True)
class GetAnalysisStatusUseCase:
    repository: AnalysisRepository

    def execute(self, *, check_id: str) -> AnalysisStatusResponseDTO:
        snapshot = self.repository.get_status(check_id=check_id)
        if snapshot is None:
            raise AppError(
                code="ANALYSIS_NOT_FOUND",
                message="Analysis was not found.",
                status_code=404,
            )

        return AnalysisStatusResponseDTO(
            check_id=snapshot.check_id,
            status=snapshot.status,
            progress=snapshot.progress,
            error=snapshot.error,
        )
