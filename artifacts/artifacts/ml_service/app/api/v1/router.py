"""
app/api/v1/router.py — API v1 Router Registry
===============================================
Mounts all v1 endpoint routers under the /api/v1 prefix.
This router is included by the top-level route registry in
app/api/routes/__init__.py.

Adding a new endpoint group:
  1. Create app/api/v1/endpoints/<domain>.py with an APIRouter
  2. Import it here and call v1_router.include_router(...)
  3. Add a comment documenting which Module it belongs to

Current endpoints:
  GET /ml/api/v1/health   — detailed readiness check

Planned endpoints (added module by module):
  Module 2:  POST /ml/api/v1/preprocess
  Module 3:  POST /ml/api/v1/features/engineer
  Module 4:  POST /ml/api/v1/models/train
             POST /ml/api/v1/models/predict
             GET  /ml/api/v1/models
             GET  /ml/api/v1/models/{id}
  Module 5:  GET  /ml/api/v1/models/{id}/evaluate
             GET  /ml/api/v1/models/compare
  Module 6:  POST /ml/api/v1/auth/login
             POST /ml/api/v1/auth/logout
             GET  /ml/api/v1/users/me
  Module 7:  CRUD /ml/api/v1/incidents
  Module 8:  POST /ml/api/v1/assistant/chat
  Module 9:  POST /ml/api/v1/reports/generate
             GET  /ml/api/v1/reports
"""

from fastapi import APIRouter

from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.predict import router as predict_router

v1_router = APIRouter(prefix="/api/v1")

# ── Phase 3: Foundation ───────────────────────────────────────────────────────
v1_router.include_router(health_router)

# ── Module 4: ML Engine ───────────────────────────────────────────────────────
v1_router.include_router(predict_router)
# from app.api.v1.endpoints.models import router as models_router
# v1_router.include_router(models_router, prefix="/models")

# ── Module 6: Auth & Users ────────────────────────────────────────────────────
# from app.api.v1.endpoints.auth import router as auth_router
# from app.api.v1.endpoints.users import router as users_router
# v1_router.include_router(auth_router, prefix="/auth")
# v1_router.include_router(users_router, prefix="/users")

# ── Module 7: Incidents ───────────────────────────────────────────────────────
# from app.api.v1.endpoints.incidents import router as incidents_router
# v1_router.include_router(incidents_router, prefix="/incidents")

# ── Module 8: Generative AI ───────────────────────────────────────────────────
# from app.api.v1.endpoints.assistant import router as assistant_router
# v1_router.include_router(assistant_router, prefix="/assistant")
