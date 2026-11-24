"""
app/core/security.py — Password Hashing & JWT Utilities
=========================================================
Security primitives used by the authentication layer.

Responsibilities:
  - Hash and verify passwords using bcrypt
  - Generate cryptographically secure random tokens
  - Encode and decode JWT access/refresh tokens
  - Enforce token expiry and algorithm restrictions

This module is intentionally stateless. It depends only on settings for
secret keys and expiry durations — no database access here.

Supported token types:
  access  — short-lived, contains id, sub, email, role, type="access"
  refresh — long-lived, contains id, sub, type="refresh", jti

JWT algorithm is hardcoded to HS256. No other algorithm is accepted.
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.exceptions import UnauthorizedError

# ─── Password Hashing ──────────────────────────────────────────────────────────

# bcrypt with reasonable default rounds
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Return a bcrypt hash of the supplied plaintext password."""
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if the plaintext password matches the stored hash."""
    return _pwd_context.verify(plain_password, hashed_password)


def is_password_strong(password: str) -> bool:
    """
    Basic strength check. Enforced at service level before hashing.
    Rules: ≥8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 special char.
    """
    if len(password) < 8:
        return False
    if not any(c.isupper() for c in password):
        return False
    if not any(c.islower() for c in password):
        return False
    if not any(c.isdigit() for c in password):
        return False
    if not any(c for c in password if c in "!@#$%^&*()-_=+[]{}|;:,.<>?"):
        return False
    return True


# ─── Random Token Generation ───────────────────────────────────────────────────


def generate_refresh_token() -> str:
    """
    Generate a cryptographically secure opaque refresh token.
    Returns a URL-safe 64-character hex string (256 bits of entropy).
    """
    return secrets.token_hex(32)


def hash_token(token: str) -> str:
    """
    Hash an opaque token for database storage.
    Uses SHA-256 so the raw token can never be reconstructed from the DB.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# ─── JWT Encoding / Decoding ───────────────────────────────────────────────────


def create_access_token(
    user_id: str,
    email: str,
    role: str,
) -> str:
    """
    Create a short-lived JWT access token.

    Payload claims:
      sub   — user UUID
      email — user email
      role  — user role (admin | analyst | viewer)
      type  — "access"
      iat   — issued at
      exp   — expiry
    """
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "type": "access",
        "iat": now,
        "exp": expires,
        "jti": str(uuid4()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def create_refresh_token(user_id: str) -> tuple[str, str, datetime]:
    """
    Create a long-lived JWT refresh token.
    Returns (raw_token, token_hash, expires_at).

    The refresh token is a JWT containing a random opaque JTI.
    The hash of that JTI is stored in the database; the full token is
    returned only once to the client.
    """
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    jti = generate_refresh_token()
    payload = {
        "sub": user_id,
        "type": "refresh",
        "iat": now,
        "exp": expires,
        "jti": jti,
    }
    raw_token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    return raw_token, hash_token(jti), expires


def decode_token(token: str, expected_type: str) -> dict[str, Any]:
    """
    Decode and validate a JWT.

    Args:
        token — the raw JWT string
        expected_type — "access" or "refresh"

    Raises:
        UnauthorizedError if the token is missing, expired, malformed,
        has the wrong algorithm, or the wrong type claim.
    """
    if not token:
        raise UnauthorizedError("Authentication token is missing")

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=["HS256"],
            options={"require": ["sub", "exp", "type"]},
        )
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError("Token has expired")
    except JWTError:
        raise UnauthorizedError("Invalid authentication token")

    token_type = payload.get("type")
    if token_type != expected_type:
        raise UnauthorizedError(f"Expected {expected_type} token")

    return payload


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode an access token and return its payload."""
    return decode_token(token, expected_type="access")


def decode_refresh_token(token: str) -> dict[str, Any]:
    """Decode a refresh token and return its payload."""
    return decode_token(token, expected_type="refresh")
