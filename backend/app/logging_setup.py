"""Structured request logging with a request id. Never logs bodies, document text or emails."""

import logging
import time
import uuid

from fastapi import FastAPI, Request

logger = logging.getLogger("radix.request")


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


def register_request_logging(app: FastAPI) -> None:
    @app.middleware("http")
    async def log_request(request: Request, call_next):
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
        request.state.request_id = request_id
        start = time.perf_counter()
        response = await call_next(request)
        latency_ms = round((time.perf_counter() - start) * 1000)
        response.headers["x-request-id"] = request_id
        logger.info(
            "request_id=%s method=%s path=%s status=%s latency_ms=%s",
            request_id, request.method, request.url.path, response.status_code, latency_ms,
        )
        return response
