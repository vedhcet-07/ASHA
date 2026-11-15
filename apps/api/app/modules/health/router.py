"""Health check endpoint.

``GET /health`` always returns HTTP 200. The ``db`` field reports whether
Supabase is reachable — it is never an error condition from the caller's
perspective (the endpoint itself must stay up even when the DB is down).
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings
from app.core.logging import get_logger

router = APIRouter()
log = get_logger(__name__)


class HealthResponse(BaseModel):
    status: str
    db: str


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description=(
        "Returns `{\"status\": \"ok\", \"db\": \"connected\"}` when Supabase is reachable, "
        "or `{\"status\": \"ok\", \"db\": \"unavailable\"}` when it is not. "
        "Always HTTP 200."
    ),
)
async def health_check() -> HealthResponse:
    """Ping Supabase with a lightweight query and report DB connectivity."""
    db_status = _ping_db()
    return HealthResponse(status="ok", db=db_status)


def _ping_db() -> str:
    """Return ``'connected'`` or ``'unavailable'``. Never raises."""
    try:
        from supabase import create_client

        client = create_client(settings.supabase_url, settings.supabase_service_role_key)
        # postgrest-py raises if the server is unreachable; a 404/PGRST116 on a
        # non-existent table still means the DB round-trip succeeded.
        client.rpc("pg_catalog.version").execute()  # type: ignore[attr-defined]
        return "connected"
    except Exception as exc:  # noqa: BLE001
        # Distinguish a "DB is there but RPC not found" (connected) from a true
        # network or auth failure (unavailable).
        exc_msg = str(exc).lower()
        if any(keyword in exc_msg for keyword in ("function", "does not exist", "pgrst")):
            # The request reached PostgreSQL; the DB is up.
            return "connected"
        log.warning("health_db_ping_failed", exc=str(exc))
        return "unavailable"
