"""
app/api/v1/endpoints/health.py — Detailed Health Check Endpoint
================================================================
GET /ml/api/v1/health

Returns a structured health report covering all system dependencies.
Used by monitoring systems, orchestrators, and readiness probes.

Response structure:
  status  — "ok" | "degraded" | "unavailable"
  version — application version string
  checks:
    database  — PostgreSQL connectivity and latency
    ml_engine — whether trained models are loaded and ready

Status rules:
  ok          — all checks passed
  degraded    — some non-critical checks failed (service still usable)
  unavailable — database is unreachable (service cannot serve requests)

Contrast with GET /ml/healthz (liveness probe — no dependency checks).
This endpoint is the readiness probe.
"""

import time

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.database import ping_database
from app.core.logger import get_logger
from app.schemas.common import HealthResponse, ServiceCheck

router = APIRouter()
logger = get_logger(__name__)

APP_VERSION = "1.0.0"


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Detailed readiness check",
    description=(
        "Checks connectivity to all downstream dependencies. "
        "Returns 200 OK when the service is ready to accept traffic, "
        "503 when a critical dependency is unavailable."
    ),
    tags=["health"],
)
async def readiness_check() -> JSONResponse:
    """
    Full readiness probe — checks every downstream dependency.
    Returns HTTP 503 if the database is unreachable.
    """
    checks: dict[str, ServiceCheck] = {}
    overall = "ok"

    # ── Database check ────────────────────────────────────────────────────────
    db_start = time.perf_counter()
    db_ok = await ping_database()
    db_latency = round((time.perf_counter() - db_start) * 1000, 2)

    checks["database"] = ServiceCheck(
        status="ok" if db_ok else "unavailable",
        latency_ms=db_latency if db_ok else None,
        detail=None if db_ok else "Cannot reach PostgreSQL",
    )

    if not db_ok:
        overall = "unavailable"

    # ── ML engine check ───────────────────────────────────────────────────────
    # Phase 3: engine is not yet initialised — report as pending (not critical)
    checks["ml_engine"] = ServiceCheck(
        status="pending",
        detail="ML models are loaded in Module 4",
    )

    # Build response
    response_body = HealthResponse(
        status=overall,
        version=APP_VERSION,
        checks=checks,
    )

    http_status = 200 if overall != "unavailable" else 503

    if overall != "ok":
        logger.warning("Health check degraded", extra={"checks": {k: v.model_dump() for k, v in checks.items()}})

    return JSONResponse(
        status_code=http_status,
        content=response_body.model_dump(),
    )
