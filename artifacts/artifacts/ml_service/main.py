"""
IncidentIQ — ML Service / Primary Backend Entry Point
======================================================
FastAPI application factory and startup lifecycle.

Startup sequence (lifespan):
  1. configure_logging()    — structured logging before anything else
  2. init_db()              — create async SQLAlchemy engine + session pool
  3. ping_database()        — verify DB is reachable before accepting traffic
  4. [Future] load_models() — warm ML model artefacts from disk (Module 4)

Middleware stack (outermost → innermost on every request):
  CORSMiddleware            — handle preflight; set CORS headers
  RequestIDMiddleware       — attach / generate X-Request-ID
  RequestLoggingMiddleware  — structured access log per request

Exception handlers (in priority order):
  IncidentIQException       — application-level errors → structured JSON
  HTTPException             — FastAPI/Starlette errors → structured JSON
  RequestValidationError    — Pydantic schema errors  → structured JSON
  Exception                 — catch-all                → safe 500 JSON

Routing:
  /ml/healthz               — liveness probe (no DB check, always fast)
  /ml/api/v1/health         — readiness probe (checks DB, ML engine)
  /ml/api/v1/...            — all versioned application endpoints

Internal-use only:
  This service is not directly exposed to the internet.
  All external traffic is proxied through the frontend / API gateway.
"""

import sys
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.database import close_db, init_db, ping_database
from app.core.exceptions import (
    IncidentIQException,
    http_exception_handler,
    incidentiq_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.logger import configure_logging, get_logger
from app.middleware import RequestIDMiddleware, RequestLoggingMiddleware

# ── Logging must be configured before the first log statement ─────────────────
configure_logging(debug=settings.DEBUG, log_level=settings.LOG_LEVEL)
logger = get_logger(__name__)


# ─── Lifespan ──────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown lifecycle.
    Everything before `yield` runs on startup; everything after on shutdown.
    """
    # ── Startup ───────────────────────────────────────────────────────────────
    logger.info("IncidentIQ backend starting", extra={"version": "1.0.0", "debug": settings.DEBUG})

    # Initialise async SQLAlchemy engine
    init_db(settings.async_database_url)

    # Verify DB is reachable before accepting traffic
    db_ok = await ping_database()
    if db_ok:
        logger.info("Database connection verified")
    else:
        logger.error(
            "Database is unreachable at startup — service will start in degraded mode. "
            "Check DATABASE_URL and ensure PostgreSQL is running."
        )

    # Module 4 will add model loading here:
    # await load_active_models()

    logger.info(
        "IncidentIQ backend ready",
        extra={
            "host": settings.HOST,
            "port": settings.PORT,
            "docs": f"http://{settings.HOST}:{settings.PORT}/ml/docs",
        },
    )

    yield  # ← Application handles requests between startup and shutdown

    # ── Shutdown ──────────────────────────────────────────────────────────────
    logger.info("IncidentIQ backend shutting down")
    await close_db()
    logger.info("Shutdown complete")


# ─── Application Factory ───────────────────────────────────────────────────────


def create_application() -> FastAPI:
    """
    Construct and configure the FastAPI application.
    Separated into a factory function to support testing — tests can call
    create_application() with a patched settings object.
    """
    app = FastAPI(
        title="IncidentIQ",
        description=(
            "AI-Powered Incident Detection and Root Cause Analysis Platform.\n\n"
            "Detects anomalies in system telemetry using an ensemble of ML models, "
            "performs automated root cause analysis, and provides a natural language "
            "AI assistant for incident investigation."
        ),
        version="1.0.0",
        docs_url="/ml/docs",
        redoc_url="/ml/redoc",
        openapi_url="/ml/openapi.json",
        lifespan=lifespan,
    )

    # ── Exception Handlers ────────────────────────────────────────────────────
    # Registered before middleware so they have access to the processed request.
    app.add_exception_handler(IncidentIQException, incidentiq_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

    # ── Middleware (registered in reverse execution order) ────────────────────
    # Starlette applies middleware in LIFO order, so the LAST add_middleware
    # call here is the OUTERMOST layer (executed first on every request).
    #
    # Desired execution order on request:
    #   CORS → RequestID → RequestLogging → route handler
    #
    # Therefore register in this order (innermost first):
    app.add_middleware(RequestLoggingMiddleware)   # ③ innermost
    app.add_middleware(RequestIDMiddleware)        # ② middle
    app.add_middleware(                            # ① outermost
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    # ── Routers ───────────────────────────────────────────────────────────────
    from app.api.routes import router as api_router
    app.include_router(api_router, prefix="/ml")

    return app


# Module-level application instance used by uvicorn
app = create_application()


# ─── Entrypoint ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="warning",    # Suppress uvicorn's own logs — we handle logging
        access_log=False,       # We handle access logs in RequestLoggingMiddleware
    )
