"""
app/dependencies/auth.py — Authentication Dependencies
=========================================================
FastAPI dependencies for protecting routes and extracting the current user.

Dependencies:
  get_current_user        — decode access token from Authorization header
  get_current_active_user — current user + require is_active
  require_admin           — only admin role
  require_analyst         — admin or analyst role
  require_role            — factory for custom allowed roles

Usage:
    @router.get("/admin-only")
    async def admin_dashboard(user: CurrentUser = Depends(require_admin)):
        ...

The access token is read from the Authorization header using the Bearer scheme:
    Authorization: Bearer <access_token>
"""

from __future__ import annotations

from typing import Annotated, Sequence

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.models.auth import UserModel
from app.repositories.users import UserRepository
from app.dependencies.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

# HTTPBearer returns 403 by default when token is missing; we override below.
_auth_scheme = HTTPBearer(auto_error=False)


# ─── Token Extraction ──────────────────────────────────────────────────────────


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_auth_scheme)],
    db: AsyncSession = Depends(get_db),
) -> UserModel:
    """
    Decode the access token from the Authorization header and load the user.

    Raises:
        UnauthorizedError if the token is missing, invalid, or expired.
        UnauthorizedError if the user does not exist or is inactive.
    """
    if not credentials or not credentials.credentials:
        raise UnauthorizedError("Authorization header is missing or invalid")

    token = credentials.credentials
    payload = decode_access_token(token)
    user_id = payload.get("sub")

    if not user_id:
        raise UnauthorizedError("Invalid token payload")

    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)

    if user is None:
        raise UnauthorizedError("User not found")
    if not user.is_active:
        raise UnauthorizedError("Account is deactivated")

    return user


async def get_current_active_user(
    user: Annotated[UserModel, Depends(get_current_user)],
) -> UserModel:
    """Same as get_current_user but explicitly enforces the active check."""
    if not user.is_active:
        raise UnauthorizedError("Account is deactivated")
    return user


# Typed shorthand for route signatures
CurrentUser = Annotated[UserModel, Depends(get_current_active_user)]


# ─── Role Guards ───────────────────────────────────────────────────────────────


def require_role(allowed_roles: Sequence[str]):
    """
    Factory dependency that restricts a route to users with one of the allowed roles.

    Example:
        @router.get("/reports", dependencies=[Depends(require_role(["admin", "analyst"]))])
        async def list_reports():
            ...
    """
    allowed = set(allowed_roles)

    async def _role_checker(user: CurrentUser) -> UserModel:
        if user.role not in allowed:
            raise ForbiddenError(
                f"This action requires one of these roles: {', '.join(sorted(allowed))}"
            )
        return user

    return _role_checker


async def require_admin(user: CurrentUser) -> UserModel:
    """Dependency that allows only admin users."""
    if user.role != "admin":
        raise ForbiddenError("This action requires admin privileges")
    return user


async def require_analyst(user: CurrentUser) -> UserModel:
    """Dependency that allows admin or analyst users."""
    if user.role not in {"admin", "analyst"}:
        raise ForbiddenError("This action requires analyst or admin privileges")
    return user


AdminUser = Annotated[UserModel, Depends(require_admin)]
AnalystUser = Annotated[UserModel, Depends(require_analyst)]


# ─── Optional Authentication ─────────────────────────────────────────────────────


async def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_auth_scheme)],
    db: AsyncSession = Depends(get_db),
) -> UserModel | None:
    """
    Same as get_current_user but returns None instead of raising.
    Useful for endpoints that serve both authenticated and anonymous traffic.
    """
    if not credentials or not credentials.credentials:
        return None
    try:
        return await get_current_user(credentials, db)
    except UnauthorizedError:
        return None
