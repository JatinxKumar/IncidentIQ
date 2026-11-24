"""
app/core/database.py — Async Database Connection Layer
========================================================
Sets up the SQLAlchemy 2.0 async engine, session factory, and
declarative base for all ORM models.

Architecture:
  engine          — single AsyncEngine per process (connection pooled)
  async_session   — AsyncSession factory; one session per request
  Base            — DeclarativeBase that all ORM models inherit from

The engine is created lazily on first use (init_db() call in lifespan).
This avoids connection errors during import.

Usage in routes (via DI — see app/dependencies/database.py):
    async def my_route(db: AsyncSession = Depends(get_db)):
        result = await db.execute(select(UsersTable))

Direct usage in scripts:
    from app.core.database import async_session_factory
    async with async_session_factory() as session:
        ...

DB URL format:
  The standard PostgreSQL URL (postgres:// or postgresql://) is
  automatically converted to the asyncpg dialect URL
  (postgresql+asyncpg://) by Settings.async_database_url.
"""

from __future__ import annotations

import logging
from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.logger import get_logger

logger = get_logger(__name__)

# Module-level engine reference — initialised in init_db()
_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


# ─── ORM Base ──────────────────────────────────────────────────────────────────


class Base(DeclarativeBase):
    """
    Declarative base class for all SQLAlchemy ORM models.
    All table definitions in app/models/ must inherit from this class.

    Note: The canonical schema definition lives in lib/db/ (Drizzle ORM,
    used by the Node.js tooling and migrations). The SQLAlchemy models
    here mirror that schema for Python-side queries. Keep them in sync.
    """
    pass


# ─── Engine Initialisation ─────────────────────────────────────────────────────


def init_db(async_database_url: str) -> None:
    """
    Create the async engine and session factory.
    Call once at application startup inside the lifespan context.

    Args:
        async_database_url: postgresql+asyncpg:// connection string
    """
    global _engine, _session_factory

    if _engine is not None:
        logger.warning("init_db called more than once — skipping")
        return

    # asyncpg does not parse ?sslmode= query params from the URL.
    # Strip it from the URL and pass ssl as a connect_arg instead.
    import re as _re
    ssl_required = "sslmode=require" in async_database_url
    clean_url = _re.sub(r"\?.*$", "", async_database_url)

    connect_args: dict = {}
    if ssl_required:
        connect_args["ssl"] = "require"

    _engine = create_async_engine(
        clean_url,
        echo=False,           # Set True to log all SQL — noisy, dev-only
        pool_size=10,         # Max persistent connections per process
        max_overflow=20,      # Additional connections when pool is exhausted
        pool_timeout=30,      # Seconds to wait for a connection before raising
        pool_recycle=1800,    # Recycle connections after 30 minutes
        pool_pre_ping=True,   # Verify connection liveness before use
        connect_args=connect_args,
    )

    _session_factory = async_sessionmaker(
        bind=_engine,
        class_=AsyncSession,
        expire_on_commit=False,  # Prevent implicit SELECT after commit
        autoflush=False,         # Explicit flush control in repositories
        autocommit=False,
    )

    logger.info("Database engine initialised")


async def close_db() -> None:
    """
    Dispose of the engine connection pool.
    Call at application shutdown inside the lifespan context.
    """
    global _engine, _session_factory

    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None
        logger.info("Database engine disposed")


# ─── Session Factory ───────────────────────────────────────────────────────────


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """
    Return the module-level session factory.
    Raises RuntimeError if init_db() has not been called.
    """
    if _session_factory is None:
        raise RuntimeError(
            "Database not initialised. Call init_db() at startup."
        )
    return _session_factory


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Async generator that yields one AsyncSession per call.
    Commits on success, rolls back on exception, always closes the session.
    Used by the get_db dependency in app/dependencies/database.py.
    """
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ─── Health / Diagnostics ──────────────────────────────────────────────────────


async def ping_database() -> bool:
    """
    Execute a lightweight query to verify database connectivity.
    Returns True on success, False on failure.
    Used by the health check endpoint.
    """
    if _engine is None:
        logger.warning("ping_database called before init_db()")
        return False
    try:
        async with _engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.error(
            "Database ping failed",
            extra={"error": type(exc).__name__, "detail": str(exc)},
        )
        return False
