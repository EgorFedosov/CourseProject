from fastapi import APIRouter, Depends

from app.api.v1.routes.analysis_dependencies import get_submit_feedback_use_case
from app.application.dto.feedback import (
    FeedbackCorrectionsRequestDTO,
    FeedbackCorrectionsResponseDTO,
)
from app.application.use_cases.submit_feedback_corrections import (
    SubmitFeedbackCorrectionsUseCase,
)

router = APIRouter(tags=["feedback"])


@router.post(
    "/feedback/corrections",
    response_model=FeedbackCorrectionsResponseDTO,
    summary="Submit teacher corrections for analysis",
)
def submit_feedback_corrections(
    payload: FeedbackCorrectionsRequestDTO,
    use_case: SubmitFeedbackCorrectionsUseCase = Depends(get_submit_feedback_use_case),
) -> FeedbackCorrectionsResponseDTO:
    return use_case.execute(payload=payload)
