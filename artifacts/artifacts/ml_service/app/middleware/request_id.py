"""
app/middleware/request_id.py — Request ID Middleware
======================================================
Attaches a unique request ID to every incoming request.

Behaviour:
  1. Reads X-Request-ID from the incoming request headers.
  2. If absent, generates a new UUID4.
  3. Stores the ID in request.state.request_id so any code
     handling the request can include it in logs or responses.
  4. Echoes it back in the X-Request-ID response header so
     clients and load balancers can correlate requests.

This middleware must be registered before RequestLoggingMiddleware
so the logger can read request.state.request_id.
"""

import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

REQUEST_ID_HEADER = "X-Request-ID"


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Injects a request ID into every request's state and response headers.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Honour the caller's ID if provided (e.g. from a load balancer)
        request_id = request.headers.get(REQUEST_ID_HEADER) or str(uuid.uuid4())
        request.state.request_id = request_id

        response: Response = await call_next(request)
        response.headers[REQUEST_ID_HEADER] = request_id
        return response
