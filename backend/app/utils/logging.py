import logging
import sys
import time
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Custom formatter for structured logging
class StructuredFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        timestamp = self.formatTime(record, "%Y-%m-%d %H:%M:%S")
        return f"[{timestamp}] [{record.levelname}] [{record.name}] {record.getMessage()}"


def setup_logging():
    """Configure structured logging for the application."""
    formatter = StructuredFormatter()
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.handlers = [handler]

    # Specific library logging levels
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


# Application logger
logger = logging.getLogger("app")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all requests and responses with timing."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        path = request.url.path
        method = request.method

        try:
            response = await call_next(request)
            duration = time.time() - start_time
            status_code = response.status_code

            logger.info(
                f"Request {method} {path} completed with {status_code} in {duration:.3f}s"
            )
            return response

        except Exception as exc:
            duration = time.time() - start_time
            logger.error(
                f"Request {method} {path} failed after {duration:.3f}s: {type(exc).__name__}: {str(exc)}",
                exc_info=True
            )
            raise
