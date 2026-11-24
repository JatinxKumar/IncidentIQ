"""
app/services/base.py — Generic Service Base Class
===================================================
Abstract base class that all domain services inherit from.

The service layer sits between the route handlers and the repositories.
It is responsible for:
  - Orchestrating one or more repository calls per operation
  - Enforcing business rules (e.g. "only one active model per algorithm")
  - Raising typed application exceptions (NotFoundError, ConflictError)
  - Mapping between domain models and Pydantic schemas

The base class provides default implementations of get, list, create,
update, and delete that delegate directly to the repository. Domain
services override only the methods where business logic is required.

Type parameters:
  ModelT        — SQLAlchemy ORM model (e.g. IncidentModel)
  CreateSchemaT — Pydantic schema for create requests (e.g. InsertIncident)
  UpdateSchemaT — Pydantic schema for update requests (e.g. UpdateIncident)

Adding a new service:
    # app/services/incident_service.py
    from app.services.base import BaseService
    from app.repositories.incidents import IncidentRepository
    from app.models.incident import IncidentModel
    from app.schemas.incidents import InsertIncident, UpdateIncident

    class IncidentService(BaseService[IncidentModel, InsertIncident, UpdateIncident]):
        def __init__(self, repo: IncidentRepository = Depends()):
            super().__init__(repo)

        async def resolve(self, incident_id: UUID) -> IncidentModel:
            incident = await self.get(incident_id)
            if incident.status == "closed":
                raise ConflictError("Cannot resolve an already-closed incident")
            return await self.update(incident_id, {"status": "resolved", ...})
"""

from __future__ import annotations

from typing import Any, Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel as PydanticModel

from app.core.exceptions import NotFoundError
from app.repositories.base import BaseRepository, ModelT

# Pydantic schema type variables
CreateSchemaT = TypeVar("CreateSchemaT", bound=PydanticModel)
UpdateSchemaT = TypeVar("UpdateSchemaT", bound=PydanticModel)


class BaseService(Generic[ModelT, CreateSchemaT, UpdateSchemaT]):
    """
    Generic service with default CRUD delegation to the repository.

    Subclasses that need business logic override individual methods.
    Subclasses that need additional repositories accept them in __init__.
    """

    # The human-readable resource name used in NotFoundError messages
    # Override in subclasses: resource_name = "incident"
    resource_name: str = "resource"

    def __init__(self, repository: BaseRepository[ModelT]) -> None:
        self._repo = repository

    # ─── Read ──────────────────────────────────────────────────────────────────

    async def get(self, record_id: UUID) -> ModelT:
        """
        Fetch a record by ID.
        Raises NotFoundError if the record does not exist.
        """
        instance = await self._repo.get_by_id(record_id)
        if instance is None:
            raise NotFoundError(self.resource_name, record_id)
        return instance

    async def list(
        self,
        *,
        filters: list[Any] | None = None,
        order_by: Any = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[ModelT], int]:
        """
        Fetch a paginated list and its total count.
        Returns (items, total) so callers can build PaginatedResponse.
        """
        items = await self._repo.list(
            filters=filters,
            order_by=order_by,
            offset=offset,
            limit=limit,
        )
        total = await self._repo.count(filters=filters)
        return items, total

    # ─── Write ─────────────────────────────────────────────────────────────────

    async def create(self, schema: CreateSchemaT) -> ModelT:
        """
        Create a new record from a Pydantic create schema.
        Subclasses override this to add uniqueness checks, emit audit events, etc.
        """
        data = schema.model_dump(exclude_unset=True)
        return await self._repo.create(data)

    async def update(
        self,
        record_id: UUID,
        schema: UpdateSchemaT,
    ) -> ModelT:
        """
        Update an existing record.
        Raises NotFoundError if the record does not exist.
        Subclasses override to add business rule enforcement.
        """
        # Confirm the record exists before updating
        await self.get(record_id)
        data = schema.model_dump(exclude_unset=True)
        updated = await self._repo.update(record_id, data)
        if updated is None:
            raise NotFoundError(self.resource_name, record_id)
        return updated

    async def delete(self, record_id: UUID) -> None:
        """
        Delete a record by ID.
        Raises NotFoundError if the record does not exist.
        Subclasses override to add cascade logic, audit events, etc.
        """
        deleted = await self._repo.delete(record_id)
        if not deleted:
            raise NotFoundError(self.resource_name, record_id)
