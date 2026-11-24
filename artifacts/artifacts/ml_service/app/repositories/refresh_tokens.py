"""
app/repositories/refresh_tokens.py — Refresh Token Repository
================================================================
Data access layer for refresh tokens.

Security notes:
  - Only the SHA-256 hash of the token is stored.
  - Raw tokens are never persisted.
  - Revoked tokens are deleted (hard delete) to keep the table small.
  - A future cleanup job can remove expired tokens.
"""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import RefreshTokenModel
from app.repositories.base import BaseRepository


class RefreshTokenRepository(BaseRepository[RefreshTokenModel]):
    """Repository for `refresh_tokens` table operations."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(RefreshTokenModel, session)

    async def get_by_hash(self, token_hash: str) -> RefreshTokenModel | None:
        """
        Fetch an active (non-revoked, non-expired) refresh token by its hash.
        """
        stmt = select(self._model).where(
            self._model.token_hash == token_hash,
            self._model.revoked_at.is_(None),
            self._model.expires_at > datetime.now(timezone.utc),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def revoke_by_hash(self, token_hash: str) -> bool:
        """
        Revoke a refresh token by its hash. Returns True if found.
        Implemented as a hard delete — no need to keep stale tokens.
        """
        stmt = select(self._model).where(self._model.token_hash == token_hash)
        result = await self._session.execute(stmt)
        token = result.scalar_one_or_none()
        if token is None:
            return False
        await self._session.delete(token)
        return True

    async def revoke_all_for_user(self, user_id: str) -> None:
        """
        Revoke every refresh token for a user (e.g. password change, logout-all).
        """
        stmt = select(self._model).where(
            self._model.user_id == user_id,
            self._model.revoked_at.is_(None),
        )
        result = await self._session.execute(stmt)
        for token in result.scalars().all():
            await self._session.delete(token)
