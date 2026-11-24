"""
app/api/routes/__init__.py — Top-Level Route Registry
=======================================================
Mounts all sub-routers onto the main application router.

Route structure:
  /ml/healthz         → liveness probe   (no dependency checks, fast)
  /ml/api/v1/health   → readiness probe  (checks DB, ML engine)
  /ml/api/v1/...      → all versioned application endpoints

The separation of /healthz (liveness) from /api/v1/health (readiness)
follows the Kubernetes probe convention:
  livenessProbe  → /healthz   (is the process alive?)
  readinessProbe → /api/v1/health (is the service ready for traffic?)
"""

from fastapi import APIRouter

from app.api.routes.health import router as liveness_router
from app.api.v1.router import v1_router

router = APIRouter()

# Liveness probe — simple, no DB check
router.include_router(liveness_router, tags=["health"])

# All versioned API endpoints
router.include_router(v1_router)
