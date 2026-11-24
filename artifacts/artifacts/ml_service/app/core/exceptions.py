"""
app/core/exceptions.py — Application Exception Hierarchy
==========================================================
Custom exceptions for the IncidentIQ backend.

Design:
  - All application exceptions inherit from IncidentIQException.
  - Each exception carries an HTTP status code, a machine-readable error
    code string, and a human-readable message.
  - Exception handlers in main.py convert these to structured JSON responses.

Error code naming convention:
  RESOURCE_NOT_FOUND        → 404
  RESOURCE_CONFLICT         → 409
  VALIDATION_ERROR          → 422
  FORBIDDEN                 → 403
  UNAUTHORIZED              → 401
  SERVICE_UNAVAILABLE       → 503
  ML_INFERENCE_ERROR        → 500
  DATABASE_ERROR            → 503

Usage:
    from app.core.exceptions import NotFoundError
    raise NotFoundError("incident", incident_id)
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.logger import get_logger

logger = get_logger(__name__)


# ─── Base Exception ────────────────────────────────────────────────────────────


class IncidentIQException(Exception):
    """
    Base class for all application-level exceptions.
    All subclasses are automatically converted to JSON responses
    by the exception handler registered in main.py.
    """

    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code: str = "INTERNAL_ERROR"
    default_message: str = "An unexpected error occurred"

    def __init__(
        self,
        message: str | None = None,
        detail: Any = None,
    ) -> None:
        self.message = message or self.default_message
        self.detail = detail
        super().__init__(self.message)


# ─── 4xx Client Errors ─────────────────────────────────────────────────────────


class NotFoundError(IncidentIQException):
    """
    Raised when a requested resource does not exist.
    Usage: raise NotFoundError("incident", incident_id)
    """

    status_code = status.HTTP_404_NOT_FOUND
    error_code = "RESOURCE_NOT_FOUND"

    def __init__(
        self,
        resource: str,
        identifier: Any = None,
    ) -> None:
        id_part = f" '{identifier}'" if identifier else ""
        super().__init__(
            message=f"{resource.capitalize()}{id_part} not found",
            detail={"resource": resource, "identifier": str(identifier) if identifier else None},
        )


class ConflictError(IncidentIQException):
    """
    Raised when an action would violate a uniqueness constraint.
    Usage: raise ConflictError("User with this email already exists")
    """

    status_code = status.HTTP_409_CONFLICT
    error_code = "RESOURCE_CONFLICT"
    default_message = "A resource conflict occurred"


class ValidationError(IncidentIQException):
    """
    Raised when application-level validation fails (beyond Pydantic schema).
    Usage: raise ValidationError("confidence_score must be between 0 and 1")
    """

    status_code = 422
    error_code = "VALIDATION_ERROR"
    default_message = "Validation failed"


class UnauthorizedError(IncidentIQException):
    """
    Raised when a request lacks valid authentication credentials.
    Module 6 (Authentication) will use this.
    """

    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "UNAUTHORIZED"
    default_message = "Authentication required"


class ForbiddenError(IncidentIQException):
    """
    Raised when an authenticated user lacks permission for an action.
    Module 6 (Authentication) will use this.
    """

    status_code = status.HTTP_403_FORBIDDEN
    error_code = "FORBIDDEN"
    default_message = "You do not have permission to perform this action"


# ─── 5xx Server Errors ─────────────────────────────────────────────────────────


class ServiceUnavailableError(IncidentIQException):
    """
    Raised when a required downstream service (DB, ML pipeline) is unreachable.
    """

    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    error_code = "SERVICE_UNAVAILABLE"
    default_message = "A required service is temporarily unavailable"


class DatabaseError(IncidentIQException):
    """
    Raised when a database operation fails unexpectedly.
    Do not expose raw SQLAlchemy errors to clients — wrap them in this.
    """

    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    error_code = "DATABASE_ERROR"
    default_message = "A database error occurred"


class MLInferenceError(IncidentIQException):
    """
    Raised when an ML model fails to produce a prediction.
    Module 4 (ML Engine) will use this.
    """

    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code = "ML_INFERENCE_ERROR"
    default_message = "ML inference failed"


# ─── Exception Handlers ────────────────────────────────────────────────────────


def _get_request_id(request: Request) -> str:
    """Extract request ID from request state (set by RequestIDMiddleware)."""
    return getattr(request.state, "request_id", "unknown")


async def incidentiq_exception_handler(
    request: Request,
    exc: IncidentIQException,
) -> JSONResponse:
    """
    Converts IncidentIQException subclasses to structured JSON error responses.
    Registered in main.py via app.add_exception_handler().
    """
    request_id = _get_request_id(request)
    logger.warning(
        "Application exception",
        extra={
            "request_id": request_id,
            "error_code": exc.error_code,
            "status_code": exc.status_code,
            "message": exc.message,
        },
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "detail": exc.detail,
            },
            "request_id": request_id,
        },
    )


async def http_exception_handler(
    request: Request,
    exc: HTTPException,
) -> JSONResponse:
    """
    Converts FastAPI/Starlette HTTPExceptions to the same structured format.
    """
    request_id = _get_request_id(request)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail,
                "detail": None,
            },
            "request_id": request_id,
        },
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """
    Converts Pydantic RequestValidationError to the structured error format.
    Each validation failure is reported as a separate field-level error.
    """
    request_id = _get_request_id(request)
    field_errors = [
        {
            "field": " → ".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        }
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "detail": field_errors,
            },
            "request_id": request_id,
        },
    )


async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    """
    Catch-all for any unhandled exceptions.
    Logs the full traceback; returns a safe generic message to the client.
    """
    import traceback as tb

    request_id = _get_request_id(request)
    logger.error(
        "Unhandled exception",
        extra={
            "request_id": request_id,
            "exception_type": type(exc).__name__,
            "traceback": tb.format_exc(),
        },
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "detail": None,
            },
            "request_id": request_id,
        },
    )
