"""
app/models/auth.py — Authentication ORM Models
================================================
SQLAlchemy mapped models for the authentication domain.

These tables mirror the Drizzle schema in lib/db/src/schema/users.ts
so the Python service can query and mutate users directly.

Tables:
  users            — one row per account
  refresh_tokens   — one row per active refresh token; revoked on logout

Relationships:
  refresh_tokens.user_id → users.id
  refresh_tokens cascade delete when user is deleted
"""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class UserModel(Base):
    """
    User account mapped to the `users` PostgreSQL table.
    Mirrors lib/db/src/schema/users.ts exactly.

    Columns:
      id            — UUID primary key (auto-generated)
      email         — unique, 255 chars
      username      — unique, 100 chars
      password_hash — bcrypt hash, 60 chars
      role          — admin | analyst | viewer
      is_active     — soft-delete flag
      last_login_at — timestamp of last successful login
      created_at    — immutable row creation timestamp
      updated_at    — auto-updated on modification
    """

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column("password_hash", String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="viewer")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationship: one user can have many refresh tokens
    refresh_tokens: Mapped[list["RefreshTokenModel"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class RefreshTokenModel(Base):
    """
    Refresh token storage mapped to the `refresh_tokens` table.
    Each row represents one active refresh token issued to a user.
    Revoked tokens are deleted immediately on logout; expired tokens are
    cleaned up by a background job (Module 6 advanced).

    Columns:
      id           — UUID primary key
      user_id      — FK to users.id
      token_hash   — SHA-256 hash of the raw token (never store raw token)
      expires_at   — UTC expiry timestamp
      created_at   — issue timestamp
      revoked_at   — null until logout or forced expiry
    """

    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped[UserModel] = relationship(back_populates="refresh_tokens")
