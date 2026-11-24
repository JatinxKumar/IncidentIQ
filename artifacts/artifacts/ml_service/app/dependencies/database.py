"""
app/dependencies/database.py — Database Session Dependency
============================================================
Provides a FastAPI dependency that yields one AsyncSession per request.
The session is committed on success and rolled back on any exception.

Usage in route handlers:
    from app.dependencies import get_db
    from sqlalchemy.ext.asyncio import AsyncSession

    @router.get("/incidents")
    async def list_incidents(db: AsyncSession = Depends(get_db)):
        ...

Usage in repository constructors:
    class IncidentRepository(BaseRepository[IncidentModel]):
        def __init__(self, db: AsyncSession = Depends(get_db)):
            super().__init__(IncidentModel, db)

The session lifecycle (commit / rollback / close) is fully managed here.
Never call session.commit() or session.close() inside a route handler.
"""

from typing import Annotated, AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency: yields one AsyncSession per request.
    Commit, rollback, and close are handled automatically.
    """
    async for session in get_db_session():
        yield session


# Typed annotation shorthand for route signatures
DbSession = Annotated[AsyncSession, Depends(get_db)]
