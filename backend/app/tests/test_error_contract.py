from dataclasses import dataclass

from fastapi.testclient import TestClient

from app.api.v1.routes.analysis_dependencies import get_analysis_status_use_case
from app.core.errors import AppError
from app.main import app

client = TestClient(app)


@dataclass
class _MissingAnalysisStatusUseCase:
    def execute(
        self, *, check_id: str
    ):  # noqa: ANN201 - response is irrelevant for error path
        raise AppError(
            code="ANALYSIS_NOT_FOUND",
            message="Analysis was not found.",
            status_code=404,
            details={"check_id": check_id},
        )


def test_validation_error_contract_for_start_analysis() -> None:
    response = client.post(
        "/api/v1/analyses/start",
        json={"document_id": "doc-1"},
    )

    assert response.status_code == 422
    payload = response.json()
    assert payload["code"] == "VALIDATION_ERROR"
    assert payload["message"] == "Request validation failed."
    assert isinstance(payload["details"], list)
    assert isinstance(payload["trace_id"], str)


def test_app_error_contract_for_analysis_not_found() -> None:
    app.dependency_overrides[get_analysis_status_use_case] = (
        lambda: _MissingAnalysisStatusUseCase()
    )

    try:
        response = client.get("/api/v1/analyses/check-missing")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 404
    payload = response.json()
    assert payload == {
        "code": "ANALYSIS_NOT_FOUND",
        "message": "Analysis was not found.",
        "details": {"check_id": "check-missing"},
        "trace_id": payload["trace_id"],
    }
    assert isinstance(payload["trace_id"], str)


def test_invalid_upload_request_has_stable_error_contract() -> None:
    response = client.post(
        "/api/v1/documents/upload",
        files={"file": ("invalid.txt", b"invalid", "text/plain")},
    )

    assert response.status_code == 400
    payload = response.json()
    assert payload["code"] == "UNSUPPORTED_FILE_FORMAT"
    assert payload["message"] == "Only PDF and DOCX files are supported."
    assert payload["details"] == {"allowed_formats": ["pdf", "docx"]}
    assert isinstance(payload["trace_id"], str)
