from fastapi import APIRouter, BackgroundTasks, Depends

from app.api.v1.routes.analysis_dependencies import (
    get_analysis_status_use_case,
    get_start_analysis_use_case,
)
from app.application.dto.analysis import (
    AnalysisStatusResponseDTO,
    StartAnalysisRequestDTO,
    StartAnalysisResponseDTO,
)
from app.application.use_cases.get_analysis_status import GetAnalysisStatusUseCase
from app.application.use_cases.start_analysis import StartAnalysisUseCase

router = APIRouter(tags=["analyses"])


@router.post(
    "/analyses/start",
    response_model=StartAnalysisResponseDTO,
    summary="Start analysis pipeline",
)
def start_analysis(
    payload: StartAnalysisRequestDTO,
    background_tasks: BackgroundTasks,
    use_case: StartAnalysisUseCase = Depends(get_start_analysis_use_case),
) -> StartAnalysisResponseDTO:
    response = use_case.execute(request=payload)

    background_tasks.add_task(
        use_case.run_pipeline,
        check_id=response.check_id,
        document_id=payload.document_id,
    )

    return response


@router.get(
    "/analyses/{check_id}",
    response_model=AnalysisStatusResponseDTO,
    summary="Get analysis status",
)
def get_analysis_status(
    check_id: str,
    use_case: GetAnalysisStatusUseCase = Depends(get_analysis_status_use_case),
) -> AnalysisStatusResponseDTO:
    return use_case.execute(check_id=check_id)
