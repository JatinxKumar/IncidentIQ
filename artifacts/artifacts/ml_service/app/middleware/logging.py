"""
app/middleware/logging.py — Request / Response Logging Middleware
==================================================================
Logs every HTTP request and its corresponding response.

Log fields emitted per request:
  method       — HTTP verb (GET, POST, …)
  path         — URL path (no query string in the log line)
  query        — query string (empty string if absent)
  status_code  — HTTP response status code
  duration_ms  — wall-clock time for the full round-trip
  request_id   — from request.state (set by RequestIDMiddleware)
  client_ip    — X-Forwarded-For if present, else direct peer IP

Requests to /ml/healthz and /ml/api/v1/health are logged at DEBUG
level to prevent health-check noise filling production logs.
"""

import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logger import get_logger

logger = get_logger("incidentiq.access")

# Paths that should be logged at DEBUG rather than INFO
_QUIET_PATHS = {"/ml/healthz", "/ml/api/v1/health"}


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Structured access log middleware.
    Depends on RequestIDMiddleware having already set request.state.request_id.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()

        request_id = getattr(request.state, "request_id", "unknown")
        client_ip = (
            request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            or (request.client.host if request.client else "unknown")
        )

        response: Response = await call_next(request)

        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        path = request.url.path
        log_level = "debug" if path in _QUIET_PATHS else "info"

        getattr(logger, log_level)(
            f"{request.method} {path} → {response.status_code}",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": path,
                "query": str(request.url.query),
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "client_ip": client_ip,
            },
        )

        return response
