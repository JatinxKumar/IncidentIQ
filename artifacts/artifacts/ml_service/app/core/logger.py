"""
app/core/logger.py — Structured Logging Configuration
=======================================================
Configures Python's logging subsystem for IncidentIQ.

Behaviour:
  - Development (DEBUG=True):  colourised, human-readable format
  - Production  (DEBUG=False): newline-delimited JSON (one object per line)

JSON log fields:
  timestamp  — ISO-8601 UTC
  level      — DEBUG | INFO | WARNING | ERROR | CRITICAL
  name       — logger name (dotted module path)
  message    — log message
  request_id — present when logged inside a request context
  **kwargs   — any extra fields passed to the logger call

Usage:
    from app.core.logger import get_logger
    logger = get_logger(__name__)
    logger.info("Incident created", incident_id=str(incident.id))

Call configure_logging() once at application startup (main.py lifespan).
"""

import json
import logging
import sys
import traceback
from datetime import datetime, timezone
from typing import Any


# ─── JSON Formatter ────────────────────────────────────────────────────────────


class _JsonFormatter(logging.Formatter):
    """
    Formats log records as single-line JSON objects.
    Extra keyword arguments passed to logger calls are merged into the payload.
    """

    def format(self, record: logging.LogRecord) -> str:
        # Must set record.message before any style formatting is attempted
        record.message = record.getMessage()

        payload: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "name": record.name,
            "message": record.message,
        }

        # Attach request_id when running inside a request context
        if hasattr(record, "request_id"):
            payload["request_id"] = record.request_id

        # Merge any extra fields passed via logger.info("msg", extra={...})
        # Skip internal LogRecord bookkeeping fields
        skip = {
            "args", "created", "exc_info", "exc_text", "filename",
            "funcName", "levelname", "levelno", "lineno", "message",
            "module", "msecs", "msg", "name", "pathname", "process",
            "processName", "relativeCreated", "stack_info", "taskName",
            "thread", "threadName",
        }
        for key, value in record.__dict__.items():
            if key not in skip and not key.startswith("_"):
                payload[key] = value

        # Attach exception traceback if present
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        elif record.exc_text:
            payload["exception"] = record.exc_text

        return json.dumps(payload, default=str)


# ─── Pretty Formatter (development) ───────────────────────────────────────────


class _PrettyFormatter(logging.Formatter):
    """
    Colourised, human-readable format for development.
    Format: HH:MM:SS  LEVEL     logger.name  — message
    """

    _COLOURS = {
        "DEBUG":    "\033[36m",   # cyan
        "INFO":     "\033[32m",   # green
        "WARNING":  "\033[33m",   # yellow
        "ERROR":    "\033[31m",   # red
        "CRITICAL": "\033[35m",   # magenta
    }
    _RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        # Must set record.message before any style formatting is attempted
        record.message = record.getMessage()

        colour = self._COLOURS.get(record.levelname, "")
        ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
        req = f"  [{record.request_id}]" if hasattr(record, "request_id") else ""
        msg = record.message
        line = (
            f"{ts}  {colour}{record.levelname:<9}{self._RESET}"
            f"{record.name:<40}  {msg}{req}"
        )
        if record.exc_info:
            line += "\n" + self.formatException(record.exc_info)
        return line


# ─── Public API ────────────────────────────────────────────────────────────────


def configure_logging(debug: bool = False, log_level: str = "INFO") -> None:
    """
    Call once at application startup.
    Configures the root logger and silences noisy third-party loggers.
    """
    formatter: logging.Formatter = (
        _PrettyFormatter() if debug else _JsonFormatter()
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    root = logging.getLogger()
    root.setLevel(numeric_level)
    root.handlers.clear()
    root.addHandler(handler)

    # Suppress overly verbose third-party loggers
    for noisy in ("uvicorn.access", "sqlalchemy.engine", "asyncio"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    # Let uvicorn error logs through
    logging.getLogger("uvicorn.error").setLevel(logging.ERROR)


def get_logger(name: str) -> logging.Logger:
    """
    Return a logger for the given module name.

    Usage:
        logger = get_logger(__name__)
    """
    return logging.getLogger(name)
