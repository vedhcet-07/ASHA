"""Standard error responses and exception handlers."""

from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import uuid


def error_response(
    code: str,
    message: str,
    status_code: int,
    details: list[dict] | None = None,
) -> JSONResponse:
    body = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
        },
        "meta": {
            "request_id": str(uuid.uuid4()),
            "timestamp": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        },
    }
    if details:
        body["error"]["details"] = details  # type: ignore[index]
    return JSONResponse(status_code=status_code, content=body)


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    details = [
        {"field": " -> ".join(str(loc) for loc in e["loc"]), "issue": e["msg"]}
        for e in exc.errors()
    ]
    return error_response(
        code="VALIDATION_ERROR",
        message="Invalid request payload",
        status_code=422,
        details=details,
    )


class AshaAPIError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


async def asha_api_error_handler(
    request: Request, exc: AshaAPIError
) -> JSONResponse:
    return error_response(
        code=exc.code,
        message=exc.message,
        status_code=exc.status_code,
    )
