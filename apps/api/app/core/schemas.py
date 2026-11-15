"""Standard response envelope for the ASHA Platform API.

Every successful endpoint response is wrapped in ``SuccessResponse[T]``:

    {
        "success": true,
        "data": { ... },
        "meta": {
            "request_id": "550e8400-e29b-41d4-a716-446655440000",
            "timestamp": "2024-01-01T12:00:00+00:00"
        }
    }

Error responses use ``ErrorResponse`` (defined in ``core/errors.py``).
Both share the same ``ResponseMeta`` model so the envelope is consistent
across success and error paths.

Usage::

    from app.core.schemas import SuccessResponse, success_response

    @router.get("/orders/{order_id}", response_model=SuccessResponse[OrderResponse])
    async def get_order(order_id: str, request: Request) -> SuccessResponse[OrderResponse]:
        order = await order_service.get(order_id)
        return success_response(OrderResponse.model_validate(order), request)
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Generic, TypeVar

from fastapi import Request
from pydantic import BaseModel

# Re-export ResponseMeta and ErrorResponse from errors.py so callers can
# import everything envelope-related from a single module.
from app.core.errors import ErrorResponse, ResponseMeta

__all__ = [
    "ResponseMeta",
    "ErrorResponse",
    "SuccessResponse",
    "success_response",
]

T = TypeVar("T")


# ---------------------------------------------------------------------------
# Success envelope
# ---------------------------------------------------------------------------


class SuccessResponse(BaseModel, Generic[T]):
    """Generic wrapper for every successful API response.

    ``success`` is always ``True`` — callers can discriminate success from
    error by checking this field without inspecting HTTP status codes.
    """

    success: bool = True
    data: T
    meta: ResponseMeta


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def success_response(data: T, request: Request) -> SuccessResponse[T]:
    """Build a ``SuccessResponse`` with ``meta`` populated from the request.

    ``request_id`` is read from ``request.state.request_id`` (injected by
    ``RequestIDMiddleware``).  If the middleware has not run (e.g. in unit
    tests that call service functions directly) a fresh UUID is generated so
    the helper never raises.
    """
    request_id: str = getattr(request.state, "request_id", str(uuid.uuid4()))
    meta = ResponseMeta(
        request_id=request_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
    return SuccessResponse(success=True, data=data, meta=meta)
