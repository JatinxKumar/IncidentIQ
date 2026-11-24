"""
app/schemas/auth.py — Authentication Request & Response Schemas
=================================================================
Pydantic v2 models for registration, login, token refresh, and logout.

All response shapes are wrapped in SuccessResponse[...] by the route layer.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.common import SuccessResponse


# ─── Request Schemas ───────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    """
    Registration payload.

    Rules:
      email    — valid email address
      username — 3-50 characters, alphanumeric + underscore/hyphen
      password — validated in service for strength (8+ chars, mixed case, digit, special)
      role     — defaults to analyst; only admin can create admin users in production
    """

    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(default="analyst")

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        allowed = {"admin", "analyst", "viewer"}
        if value not in allowed:
            raise ValueError(f"role must be one of {', '.join(sorted(allowed))}")
        return value

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        if not all(c.isalnum() or c in "_-" for c in value):
            raise ValueError("username may only contain letters, numbers, underscores, and hyphens")
        return value


class LoginRequest(BaseModel):
    """
    Login payload. Accepts either email or username as the identifier.
    """

    identifier: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    """Refresh token payload."""

    refresh_token: str = Field(..., min_length=1)


class LogoutRequest(BaseModel):
    """Logout payload. Refresh token is optional for "best-effort" logout."""

    refresh_token: str | None = None


# ─── Response Schemas ──────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    """Successful authentication response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access token expiry
    user_id: str
    role: str


class UserProfileResponse(BaseModel):
    """Public user profile returned by /me."""

    id: str
    email: str
    username: str
    role: str
    is_active: bool


# ─── Wrapped Response Types ────────────────────────────────────────────────────
# These are used as response_model annotations in the router.
# They are SuccessResponse wrappers around the actual payload types.

RegisterLoginResponse = SuccessResponse[TokenResponse]
RefreshResponse = SuccessResponse[TokenResponse]
ProfileResponse = SuccessResponse[UserProfileResponse]
MessageResponse = SuccessResponse[str]
