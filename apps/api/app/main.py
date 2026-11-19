from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
import uuid

from app.core.config import get_settings
from app.core.logging import setup_logging, logger
from app.core.errors import AppError
from app.modules.auth.router import router as auth_router
from app.modules.shg.router import router as shg_router
from app.modules.orders.router import router as orders_router
from app.modules.audit.router import router as audit_router
from app.modules.planning.router import router as planning_router
from app.modules.allocation.router import router as allocation_router
from app.modules.tasks.router import router as tasks_router
from app.modules.quality.router import router as quality_router
from app.modules.costing.router import router as costing_router
from app.modules.payouts.router import router as payouts_router
from app.modules.reports.router import router as reports_router
from app.modules.notifications.router import router as notifications_router

settings = get_settings()
setup_logging()

app = FastAPI(
    title="ASHA API",
    description="Fair work. Clear costs. Trusted payouts.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request ID & logging middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    req_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = req_id
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Request-ID"] = req_id
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    return response

# Custom exception handler
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": [d.model_dump() for d in exc.details] if exc.details else None
            },
            "meta": {
                "request_id": getattr(request.state, "request_id", None)
            }
        }
    )

# Health endpoint
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "asha-api",
        "version": "2.0.0",
        "env": settings.APP_ENV
    }

# Mount API routers under prefix
api_prefix = settings.API_V1_PREFIX
app.include_router(auth_router, prefix=api_prefix)
app.include_router(shg_router, prefix=api_prefix)
app.include_router(orders_router, prefix=api_prefix)
app.include_router(audit_router, prefix=api_prefix)
app.include_router(planning_router, prefix=api_prefix)
app.include_router(allocation_router, prefix=api_prefix)
app.include_router(tasks_router, prefix=api_prefix)
app.include_router(quality_router, prefix=api_prefix)
app.include_router(costing_router, prefix=api_prefix)
app.include_router(payouts_router, prefix=api_prefix)
app.include_router(reports_router, prefix=api_prefix)
app.include_router(notifications_router, prefix=api_prefix)

logger.info("ASHA API all phases fully loaded", env=settings.APP_ENV, prefix=api_prefix)
