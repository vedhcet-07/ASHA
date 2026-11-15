"""ASHA API — main application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.core.logging import configure_logging
from app.core.errors import (
    validation_exception_handler,
    asha_api_error_handler,
    AshaAPIError,
)
from app.modules.auth.router import router as auth_router
from app.modules.shg.router import router as shg_router

configure_logging()

app = FastAPI(
    title="ASHA API",
    description="Allocation, Shares & Honest Accounts — SHG Operations Platform",
    version="0.1.0",
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
)

# ─────────────────────────────────────
# CORS
# ─────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────
# Exception handlers
# ─────────────────────────────────────
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(AshaAPIError, asha_api_error_handler)

# ─────────────────────────────────────
# Routers
# ─────────────────────────────────────
app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(shg_router, prefix=settings.api_v1_prefix)


# ─────────────────────────────────────
# Health check
# ─────────────────────────────────────
@app.get("/health", tags=["system"])
async def health():
    return {
        "status": "ok",
        "version": "0.1.0",
        "env": settings.app_env,
    }
