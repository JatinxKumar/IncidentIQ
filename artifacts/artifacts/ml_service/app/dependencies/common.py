"""
app/dependencies/common.py — Shared Query Parameter Dependencies
=================================================================
Reusable FastAPI dependencies for pagination and sorting.
Injected into list endpoints via Depends().

Usage:
    from app.dependencies.common import PaginationParams, SortParams

    @router.get("/incidents")
    async def list_incidents(
        pagination: PaginationParams = Depends(),
        sort: SortParams = Depends(),
        db: AsyncSession = Depends(get_db),
    ):
        offset = pagination.offset
        limit  = pagination.page_size
        ...
"""

from typing import Annotated, Literal

from fastapi import Query


class PaginationParams:
    """
    Standard pagination query parameters.

    Query params:
      page       (int, default=1)   — 1-based page number
      page_size  (int, default=20)  — items per page, capped at 100
    """

    def __init__(
        self,
        page: Annotated[int, Query(ge=1, description="Page number (1-based)")] = 1,
        page_size: Annotated[
            int, Query(ge=1, le=100, description="Items per page (max 100)")
        ] = 20,
    ) -> None:
        self.page = page
        self.page_size = page_size

    @property
    def offset(self) -> int:
        """SQL OFFSET value derived from page and page_size."""
        return (self.page - 1) * self.page_size


class SortParams:
    """
    Generic sort query parameters.
    The valid values for sort_by are validated at the endpoint level —
    each endpoint passes an allowed_fields set to prevent SQL injection.

    Query params:
      sort_by    (str,  default="created_at") — column to sort by
      sort_order (str,  default="desc")       — "asc" or "desc"
    """

    def __init__(
        self,
        sort_by: Annotated[str, Query(description="Column to sort by")] = "created_at",
        sort_order: Annotated[
            Literal["asc", "desc"], Query(description="Sort direction")
        ] = "desc",
    ) -> None:
        self.sort_by = sort_by
        self.sort_order = sort_order
