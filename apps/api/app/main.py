"""ASHA Platform — FastAPI application factory.

Usage::

    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging, get_logger

# ---------------------------------------------------------------------------
# Logging — must be first so all subsequent imports emit structured logs
# ---------------------------------------------------------------------------

configure_logging(log_level=settings.log_level, production=settings.is_production)
log = get_logger(__name__)


# ---------------------------------------------------------------------------
# Request-ID middleware
# ---------------------------------------------------------------------------


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Inject a UUID4 request_id into ``request.state`` and the response header."""

    async def dispatch(self, request: Request, call_next: object) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        import structlog

        with structlog.contextvars.bound_contextvars(request_id=request_id):
            response: Response = await call_next(request)  # type: ignore[operator]

        response.headers["X-Request-ID"] = request_id
        return response


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------


def create_app() -> FastAPI:
    application = FastAPI(
        title="ASHA Platform API",
        description=(
            "Voice-first, multilingual operations platform for women's self-help groups."
        ),
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # ----- Middleware (order matters: outermost is applied last) -----

    application.add_middleware(RequestIDMiddleware)

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    # ----- Exception handlers -----

    register_exception_handlers(application)

    # ----- Routers -----
    # Each module's router is imported here and included with the shared /api/v1 prefix.
    # Stubs are commented in until the module is implemented in a later phase.

    from fastapi import APIRouter

    api_router = APIRouter(prefix="/api/v1")

    # Phase 0.8 — Health
    from app.modules.health.router import router as health_router

    api_router.include_router(health_router, tags=["health"])

    # Phase 1 — Auth & SHG
    from app.modules.auth.router import router as auth_router

    api_router.include_router(auth_router, tags=["auth"])

    from app.modules.shg.router import router as shg_router
    api_router.include_router(shg_router, tags=["shg"])

    # Phase 2 — Orders
    from app.modules.orders.router import router as orders_router

    api_router.include_router(orders_router, tags=["orders"])

    # Phase 3 — Planning & Allocation
    # from app.modules.planning.router import router as planning_router
    # from app.modules.allocation.router import router as allocation_router
    # api_router.include_router(planning_router, tags=["planning"])
    # api_router.include_router(allocation_router, tags=["allocation"])

    # Phase 4 — Tasks
    # from app.modules.tasks.router import router as tasks_router
    # api_router.include_router(tasks_router, tags=["tasks"])

    # Phase 5 — Quality
    # from app.modules.quality.router import router as quality_router
    # api_router.include_router(quality_router, tags=["quality"])

    # Phase 6 — Costing
    # from app.modules.costing.router import router as costing_router
    # api_router.include_router(costing_router, tags=["costing"])

    # Phase 7 — Payouts
    # from app.modules.payouts.router import router as payouts_router
    # api_router.include_router(payouts_router, tags=["payouts"])

    application.include_router(api_router)

    # ----- Startup / shutdown events -----

    @application.on_event("startup")
    async def on_startup() -> None:
        log.info(
            "asha_api_starting",
            version="0.1.0",
            log_level=settings.log_level,
            ai_provider=settings.ai_provider,
            cors_origins=settings.cors_origins,
        )

    @application.on_event("shutdown")
    async def on_shutdown() -> None:
        log.info("asha_api_stopping")

    return application


app = create_app()
