"""
app/api/routes/health.py — Health Check Endpoint
=================================================
Simple liveness probe used by:
  - The Node.js API server before routing ML requests
  - Replit workflow health monitoring

Response:
  GET /ml/healthz → 200 OK { status, service, version, environment }
"""

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    debug: bool


@router.get(
    "/healthz",
    response_model=HealthResponse,
    summary="ML service health check",
    description="Returns service status. Used as a liveness probe by the API server.",
)
async def health_check() -> HealthResponse:
    """Confirm the ML service is running and reachable."""
    return HealthResponse(
        status="ok",
        service="incidentiq-ml-service",
        version="1.0.0",
        debug=settings.DEBUG,
    )
