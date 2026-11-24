"""
app/services/auth_service.py — Authentication Service
========================================================
Business logic for registration, login, token refresh, and logout.

This service coordinates the UserRepository and RefreshTokenRepository
and uses the security helpers for password hashing and JWT generation.

It is designed to be fully usable as a real implementation but also
"dummy-ready": the register and login endpoints work end-to-end with
real hashing and real JWTs, so we can later switch to email verification,
OAuth, or rate limiting without touching the API contract.

Flow:
  Register → hash password → create user → create refresh token
  Login    → verify password → issue access + refresh tokens
  Refresh  → decode refresh JWT → lookup hash → issue new access token
  Logout   → decode refresh JWT → delete token hash
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, UnauthorizedError, ValidationError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
    hash_password,
    hash_token,
    is_password_strong,
    verify_password,
)
from app.models.auth import RefreshTokenModel, UserModel
from app.repositories.refresh_tokens import RefreshTokenRepository
from app.repositories.users import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse


class AuthService:
    """
    Authentication and authorization business logic.
    Accepts repositories directly; in production routes they are injected via DI.
    """

    def __init__(
        self,
        user_repo: UserRepository,
        refresh_repo: RefreshTokenRepository,
    ) -> None:
        self._user_repo = user_repo
        self._refresh_repo = refresh_repo

    # ─── Registration ──────────────────────────────────────────────────────────

    async def register(self, data: RegisterRequest) -> TokenResponse:
        """
        Create a new user account with a hashed password.

        Raises:
            ConflictError if the email or username already exists.
            ValidationError if the password does not meet strength rules.
        """
        # Validate password strength before any DB lookup
        if not is_password_strong(data.password):
            raise ValidationError(
                "Password must be at least 8 characters and contain one uppercase letter, "
                "one lowercase letter, one digit, and one special character."
            )

        # Uniqueness checks
        existing_email = await self._user_repo.get_by_email(data.email)
        if existing_email:
            raise ConflictError("An account with this email already exists")

        existing_username = await self._user_repo.get_by_username(data.username)
        if existing_username:
            raise ConflictError("This username is already taken")

        # Create user
        user_data = {
            "email": data.email,
            "username": data.username,
            "password_hash": hash_password(data.password),
            "role": data.role,
        }
        user = await self._user_repo.create(user_data)

        # Issue tokens
        return await self._issue_tokens_for_user(user)

    # ─── Login ─────────────────────────────────────────────────────────────────

    async def login(
        self,
        data: LoginRequest,
        ip_address: str | None,
        user_agent: str | None,
    ) -> TokenResponse:
        """
        Authenticate a user by email/username and password.

        Raises:
            UnauthorizedError if credentials are invalid or the account is inactive.
        """
        user = await self._user_repo.get_by_email_or_username(data.identifier)
        if user is None or not user.is_active:
            raise UnauthorizedError("Invalid credentials")

        if not verify_password(data.password, user.password_hash):
            raise UnauthorizedError("Invalid credentials")

        # Update last login timestamp
        await self._user_repo.update(
            user.id,
            {"last_login_at": datetime.now(timezone.utc)},
        )

        return await self._issue_tokens_for_user(
            user, ip_address=ip_address, user_agent=user_agent
        )

    # ─── Token Refresh ──────────────────────────────────────────────────────────

    async def refresh_access_token(self, refresh_token: str) -> TokenResponse:
        """
        Exchange a valid refresh token for a new access token (and rotate the refresh token).

        Security:
          - The old refresh token is revoked (single use).
          - A new refresh token is issued and returned.
          - If the stored token is not found, all refresh tokens for the user are revoked.
        """
        if not refresh_token:
            raise UnauthorizedError("Refresh token is missing")

        payload = decode_refresh_token(refresh_token)
        user_id = payload.get("sub")
        jti = payload.get("jti")

        if not user_id or not jti:
            raise UnauthorizedError("Invalid refresh token")

        token_hash = hash_token(jti)
        stored_token = await self._refresh_repo.get_by_hash(token_hash)

        if stored_token is None:
            # Possible token reuse or database mismatch — revoke all user tokens
            await self._refresh_repo.revoke_all_for_user(user_id)
            raise UnauthorizedError("Refresh token is invalid or has been revoked")

        user = await self._user_repo.get_by_id(user_id)
        if user is None or not user.is_active:
            await self._refresh_repo.revoke_all_for_user(user_id)
            raise UnauthorizedError("User account is no longer active")

        # Single-use rotation: revoke the old token, issue a new pair
        await self._refresh_repo.revoke_by_hash(token_hash)
        return await self._issue_tokens_for_user(user)

    # ─── Logout ─────────────────────────────────────────────────────────────────

    async def logout(self, refresh_token: str) -> None:
        """
        Revoke a refresh token (single-device logout).
        """
        if not refresh_token:
            return
        try:
            payload = decode_refresh_token(refresh_token)
        except UnauthorizedError:
            # Treat expired tokens as already logged-out
            return
        jti = payload.get("jti")
        if jti:
            await self._refresh_repo.revoke_by_hash(hash_token(jti))

    async def logout_all(self, user_id: str) -> None:
        """
        Revoke every refresh token for a user (global logout).
        """
        await self._refresh_repo.revoke_all_for_user(user_id)

    # ─── Helpers ───────────────────────────────────────────────────────────────

    async def _issue_tokens_for_user(
        self,
        user: UserModel,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> TokenResponse:
        """
        Create an access token and a refresh token for a user.
        Persist the refresh token hash in the database.
        """
        access_token = create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role,
        )
        raw_refresh, refresh_hash, expires_at = create_refresh_token(user.id)

        await self._refresh_repo.create({
            "user_id": user.id,
            "token_hash": refresh_hash,
            "expires_at": expires_at,
            "ip_address": ip_address,
            "user_agent": user_agent,
        })

        return TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh,
            token_type="bearer",
            expires_in=settings_dependency().ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=user.id,
            role=user.role,
        )


# We avoid a circular import by importing settings inside the helper.
# In production, ACCESS_TOKEN_EXPIRE_MINUTES comes from the injected settings dependency.
def settings_dependency() -> Any:
    from app.core.config import settings as _settings
    return _settings
