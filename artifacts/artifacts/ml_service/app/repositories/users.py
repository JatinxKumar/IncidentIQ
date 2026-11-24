"""
app/repositories/users.py — User Repository
============================================
Data access layer for user accounts.
Extends BaseRepository with user-specific queries.

Lookup methods are async because username/email uniqueness checks are
required during registration and login.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import UserModel
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[UserModel]):
    """
    Repository for `users` table operations.
    Constructor accepts an AsyncSession via FastAPI DI.
    """

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(UserModel, session)

    async def get_by_email(self, email: str) -> UserModel | None:
        """Fetch an active user by email address."""
        stmt = select(self._model).where(
            self._model.email == email,
            self._model.is_active.is_(True),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> UserModel | None:
        """Fetch an active user by username."""
        stmt = select(self._model).where(
            self._model.username == username,
            self._model.is_active.is_(True),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email_or_username(self, identifier: str) -> UserModel | None:
        """
        Lookup by either email or username. Used for login forms that accept both.
        """
        if "@" in identifier:
            return await self.get_by_email(identifier)
        return await self.get_by_username(identifier)
