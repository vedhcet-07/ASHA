from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from pydantic import BaseModel

class ErrorDetail(BaseModel):
    field: Optional[str] = None
    issue: str

class ErrorPayload(BaseModel):
    code: str
    message: str
    details: Optional[List[ErrorDetail]] = None

class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorPayload
    meta: Dict[str, Any] = {}

class ApiResponse(BaseModel):
    success: bool = True
    data: Any
    meta: Dict[str, Any] = {}

class AppError(HTTPException):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[List[ErrorDetail]] = None,
    ):
        super().__init__(status_code=status_code, detail=message)
        self.code = code
        self.message = message
        self.details = details

class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(code="NOT_FOUND", message=message, status_code=status.HTTP_404_NOT_FOUND)

class ForbiddenError(AppError):
    def __init__(self, message: str = "Permission denied"):
        super().__init__(code="FORBIDDEN", message=message, status_code=status.HTTP_403_FORBIDDEN)

class ConflictError(AppError):
    def __init__(self, message: str = "State conflict or resource exists"):
        super().__init__(code="CONFLICT", message=message, status_code=status.HTTP_409_CONFLICT)

class ValidationError(AppError):
    def __init__(self, message: str = "Validation failed", details: Optional[List[ErrorDetail]] = None):
        super().__init__(code="VALIDATION_ERROR", message=message, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, details=details)

class UnauthenticatedError(AppError):
    def __init__(self, message: str = "Missing or invalid authentication"):
        super().__init__(code="UNAUTHENTICATED", message=message, status_code=status.HTTP_401_UNAUTHORIZED)
