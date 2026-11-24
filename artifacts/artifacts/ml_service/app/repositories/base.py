"""
app/repositories/base.py — Generic Async Repository
=====================================================
Abstract base class that every domain repository inherits from.
Provides standard CRUD operations over SQLAlchemy 2.0 async sessions.

Design decisions:
  - Repository receives an AsyncSession via constructor (injected by DI).
  - Generic over the ORM model type (ModelT) so subclasses are fully typed.
  - All public methods are async — matches the async FastAPI request cycle.
  - Pagination uses LIMIT / OFFSET (suitable for hundreds of thousands of rows).
    Keyset pagination is added per-repository when needed at scale.
  - Filters are expressed as SQLAlchemy column expressions — never raw SQL
    strings — to prevent SQL injection.
  - The session lifecycle (commit / rollback) is managed by get_db_session()
    in app/core/database.py; repositories never call session.commit().

Adding a new repository:
    # app/repositories/incidents.py
    from app.repositories.base import BaseRepository
    from app.models.incident import IncidentModel

    class IncidentRepository(BaseRepository[IncidentModel]):
        def __init__(self, db: AsyncSession = Depends(get_db)):
            super().__init__(IncidentModel, db)

        async def list_open(self) -> list[IncidentModel]:
            stmt = select(self._model).where(
                self._model.status == "open"
            ).order_by(self._model.created_at.desc())
            result = await self._session.execute(stmt)
            return list(result.scalars().all())
"""

from __future__ import annotations

import logging
from typing import Any, Generic, Sequence, Type, TypeVar
from uuid import UUID

from sqlalchemy import func, select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import ColumnElement

from app.core.database import Base

# Generic type variable bound to any SQLAlchemy ORM model
ModelT = TypeVar("ModelT", bound=Base)

logger = logging.getLogger(__name__)


class BaseRepository(Generic[ModelT]):
    """
    Generic async CRUD repository.

    Type parameter:
        ModelT — SQLAlchemy mapped class (inherits from Base)

    Constructor:
        model   — the SQLAlchemy model class (e.g. IncidentModel)
        session — AsyncSession provided via DI

    All write operations (create, update, delete) flush to the session
    but do NOT commit. The commit is handled by get_db_session() after
    the route handler returns successfully.
    """

    def __init__(self, model: Type[ModelT], session: AsyncSession) -> None:
        self._model = model
        self._session = session

    # ─── Read ──────────────────────────────────────────────────────────────────

    async def get_by_id(self, record_id: UUID) -> ModelT | None:
        """
        Fetch a single record by its UUID primary key.
        Returns None if no record exists with that ID.
        """
        stmt = select(self._model).where(self._model.id == record_id)  # type: ignore[attr-defined]
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        *,
        filters: Sequence[ColumnElement[bool]] | None = None,
        order_by: Any = None,
        offset: int = 0,
        limit: int = 20,
    ) -> list[ModelT]:
        """
        Fetch a paginated, optionally filtered list of records.

        Args:
            filters  — sequence of SQLAlchemy WHERE expressions
            order_by — SQLAlchemy column expression for ORDER BY
            offset   — SQL OFFSET (derived from PaginationParams.offset)
            limit    — SQL LIMIT (derived from PaginationParams.page_size)

        Example:
            rows = await repo.list(
                filters=[IncidentModel.status == "open"],
                order_by=IncidentModel.created_at.desc(),
                offset=pagination.offset,
                limit=pagination.page_size,
            )
        """
        stmt = select(self._model)
        if filters:
            stmt = stmt.where(*filters)
        if order_by is not None:
            stmt = stmt.order_by(order_by)
        else:
            # Default: newest first — assumes models have created_at
            if hasattr(self._model, "created_at"):
                stmt = stmt.order_by(self._model.created_at.desc())  # type: ignore[attr-defined]
        stmt = stmt.offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def count(
        self,
        filters: Sequence[ColumnElement[bool]] | None = None,
    ) -> int:
        """
        Return the total count of records matching the optional filters.
        Used to compute total_pages in PaginatedResponse.
        """
        stmt = select(func.count()).select_from(self._model)
        if filters:
            stmt = stmt.where(*filters)
        result = await self._session.execute(stmt)
        return result.scalar_one()

    async def exists(self, record_id: UUID) -> bool:
        """Return True if a record with the given ID exists."""
        stmt = (
            select(func.count())
            .select_from(self._model)
            .where(self._model.id == record_id)  # type: ignore[attr-defined]
        )
        result = await self._session.execute(stmt)
        return result.scalar_one() > 0

    # ─── Write ─────────────────────────────────────────────────────────────────

    async def create(self, data: dict[str, Any]) -> ModelT:
        """
        Insert a new record from a dict of column values.
        The session is flushed (not committed) so the new row gets its
        database-generated defaults (id, created_at, etc.) back immediately.

        Returns the fully populated model instance.
        """
        instance = self._model(**data)
        self._session.add(instance)
        await self._session.flush()
        await self._session.refresh(instance)
        return instance

    async def update(
        self,
        record_id: UUID,
        data: dict[str, Any],
    ) -> ModelT | None:
        """
        Update a record by ID with the provided field values.
        Returns the updated instance, or None if not found.

        Only the keys present in `data` are updated — partial update semantics.
        """
        stmt = (
            update(self._model)
            .where(self._model.id == record_id)  # type: ignore[attr-defined]
            .values(**data)
            .returning(self._model)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def delete(self, record_id: UUID) -> bool:
        """
        Delete a record by ID.
        Returns True if a row was deleted, False if not found.
        """
        stmt = (
            delete(self._model)
            .where(self._model.id == record_id)  # type: ignore[attr-defined]
        )
        result = await self._session.execute(stmt)
        return result.rowcount > 0
