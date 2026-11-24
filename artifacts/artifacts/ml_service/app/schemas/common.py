"""
app/schemas/common.py — Shared Response Envelopes
===================================================
Standard Pydantic v2 response wrappers used by every endpoint.

All API responses are wrapped in one of these envelopes so clients
always receive a consistent structure regardless of the endpoint.

Success shapes:
  SuccessResponse[T]    — single item: { data, message }
  PaginatedResponse[T]  — list:        { data, total, page, page_size, total_pages }

Error shape (produced by exception handlers in core/exceptions.py):
  ErrorResponse         — { error: { code, message, detail }, request_id }

TypeScript equivalents live in artifacts/web/src/types/index.ts.
Keep them in sync when changing field names.

Usage:
    from app.schemas.common import SuccessResponse, PaginatedResponse

    @router.get("/incidents/{id}", response_model=SuccessResponse[IncidentSchema])
    async def get_incident(incident_id: UUID, ...) -> SuccessResponse[IncidentSchema]:
        incident = await service.get(incident_id)
        return SuccessResponse(data=IncidentSchema.model_validate(incident))

    @router.get("/incidents", response_model=PaginatedResponse[IncidentSchema])
    async def list_incidents(...) -> PaginatedResponse[IncidentSchema]:
        items, total = await service.list(offset=pagination.offset, limit=pagination.page_size)
        return PaginatedResponse.of(items, total, pagination)
"""

from __future__ import annotations

import math
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


# ─── Success Responses ─────────────────────────────────────────────────────────


class SuccessResponse(BaseModel, Generic[T]):
    """
    Standard single-item success response.

    Fields:
      data    — the response payload
      message — human-readable status message (default: "Success")
    """

    data: T
    message: str = "Success"

    @classmethod
    def of(cls, data: T, message: str = "Success") -> "SuccessResponse[T]":
        return cls(data=data, message=message)


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Standard paginated list response.

    Fields:
      data         — list of items for the current page
      total        — total number of items across all pages
      page         — current page number (1-based)
      page_size    — items per page
      total_pages  — ceil(total / page_size)
    """

    data: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int

    @classmethod
    def of(
        cls,
        items: list[T],
        total: int,
        pagination: Any,  # PaginationParams
    ) -> "PaginatedResponse[T]":
        """
        Construct from a list of items and a PaginationParams dependency.
        """
        total_pages = max(1, math.ceil(total / pagination.page_size)) if total else 1
        return cls(
            data=items,
            total=total,
            page=pagination.page,
            page_size=pagination.page_size,
            total_pages=total_pages,
        )


# ─── Error Response ────────────────────────────────────────────────────────────


class ErrorDetail(BaseModel):
    """
    Machine-readable error description.

    Fields:
      code     — snake_UPPER error code (e.g. RESOURCE_NOT_FOUND)
      message  — human-readable explanation
      detail   — optional structured detail (field errors, affected resource, etc.)
    """

    code: str
    message: str
    detail: Any = None


class ErrorResponse(BaseModel):
    """
    Standard error envelope returned by all exception handlers.

    Fields:
      error      — the error detail
      request_id — echoes the X-Request-ID for log correlation
    """

    error: ErrorDetail
    request_id: str = Field(description="Correlates to X-Request-ID header")


# ─── Health Check Schemas ──────────────────────────────────────────────────────


class ServiceCheck(BaseModel):
    """Status of one downstream dependency."""

    status: str          # "ok" | "degraded" | "unavailable"
    latency_ms: float | None = None
    detail: str | None = None


class HealthResponse(BaseModel):
    """
    Detailed health check response from GET /api/v1/health.

    Fields:
      status   — overall status: "ok" | "degraded" | "unavailable"
      version  — application version string
      checks   — per-dependency status map
    """

    status: str
    version: str
    checks: dict[str, ServiceCheck]
