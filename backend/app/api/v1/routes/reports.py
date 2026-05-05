from fastapi import APIRouter, Depends

from app.api.v1.routes.analysis_dependencies import get_report_use_case
from app.application.dto.report import ReportResponseDTO
from app.application.use_cases.get_report import GetReportUseCase

router = APIRouter(tags=["reports"])


@router.get(
    "/reports/{check_id}",
    response_model=ReportResponseDTO,
    summary="Get analysis report",
)
def get_report(
    check_id: str,
    use_case: GetReportUseCase = Depends(get_report_use_case),
) -> ReportResponseDTO:
    return use_case.execute(check_id=check_id)
