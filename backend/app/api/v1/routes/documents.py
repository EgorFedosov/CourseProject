from fastapi import APIRouter, Depends, File, UploadFile

from app.api.v1.routes.analysis_dependencies import get_upload_document_use_case
from app.application.dto.document import UploadDocumentResponseDTO
from app.application.use_cases.upload_document import UploadDocumentUseCase

router = APIRouter(tags=["documents"])


@router.post(
    "/documents/upload",
    response_model=UploadDocumentResponseDTO,
    summary="Upload document for analysis",
)
async def upload_document(
    file: UploadFile = File(...),
    use_case: UploadDocumentUseCase = Depends(get_upload_document_use_case),
) -> UploadDocumentResponseDTO:
    return use_case.execute(
        filename=file.filename or "",
        content_type=file.content_type,
        content=await file.read(),
    )
