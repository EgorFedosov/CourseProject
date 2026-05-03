from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.application.dto.error import ErrorResponseDTO


class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: Any | None = None,
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


def _get_trace_id(request: Request) -> str:
    return getattr(request.state, "trace_id", str(uuid4()))


def _build_error_response(
    *,
    request: Request,
    status_code: int,
    code: str,
    message: str,
    details: Any | None = None,
) -> JSONResponse:
    error_dto = ErrorResponseDTO(
        code=code,
        message=message,
        details=details,
        trace_id=_get_trace_id(request),
    )
    return JSONResponse(status_code=status_code, content=error_dto.model_dump())


async def trace_id_middleware(request: Request, call_next: Any) -> JSONResponse:
    trace_id = request.headers.get("X-Trace-Id") or str(uuid4())
    request.state.trace_id = trace_id

    response = await call_next(request)
    response.headers["X-Trace-Id"] = trace_id
    return response


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        return _build_error_response(
            request=request,
            status_code=exc.status_code,
            code=exc.code,
            message=exc.message,
            details=exc.details,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return _build_error_response(
            request=request,
            status_code=422,
            code="VALIDATION_ERROR",
            message="Request validation failed.",
            details=exc.errors(),
        )

    @app.exception_handler(HTTPException)
    async def handle_http_exception(request: Request, exc: HTTPException) -> JSONResponse:
        return _build_error_response(
            request=request,
            status_code=exc.status_code,
            code="HTTP_ERROR",
            message=str(exc.detail),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, _: Exception) -> JSONResponse:
        return _build_error_response(
            request=request,
            status_code=500,
            code="INTERNAL_SERVER_ERROR",
            message="Unexpected server error.",
        )
