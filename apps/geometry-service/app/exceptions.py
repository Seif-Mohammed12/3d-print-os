from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from typing import Any
import structlog

logger = structlog.get_logger(__name__)


class GeometryAnalysisError(Exception):
    """Base exception for geometry analysis errors."""
    
    def __init__(self, message: str, code: str = "analysis_error", details: Any = None):
        self.message = message
        self.code = code
        self.details = details
        super().__init__(message)


class InvalidSTLError(GeometryAnalysisError):
    """Raised when STL file is invalid."""
    
    def __init__(self, message: str, details: Any = None):
        super().__init__(message, "invalid_stl", details)


class AnalysisLimitExceededError(GeometryAnalysisError):
    """Raised when analysis limits are exceeded."""
    
    def __init__(self, message: str, details: Any = None):
        super().__init__(message, "limit_exceeded", details)


class StorageError(GeometryAnalysisError):
    """Raised when storage operations fail."""
    
    def __init__(self, message: str, details: Any = None):
        super().__init__(message, "storage_error", details)


class DatabaseError(GeometryAnalysisError):
    """Raised when database operations fail."""
    
    def __init__(self, message: str, details: Any = None):
        super().__init__(message, "database_error", details)


async def geometry_analysis_exception_handler(request: Request, exc: GeometryAnalysisError) -> JSONResponse:
    """Handle custom geometry analysis exceptions."""
    logger.error(
        "Geometry analysis error",
        error_code=exc.code,
        error_message=exc.message,
        details=exc.details,
        path=request.url.path
    )
    
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    
    if exc.code == "storage_error":
        status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    elif exc.code == "database_error":
        status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    elif exc.code == "limit_exceeded":
        status_code = status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
    elif exc.code in ("slicer_unavailable", "slicing_timeout"):
        status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details
            }
        }
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle generic exceptions."""
    logger.error(
        "Unhandled exception",
        error=str(exc),
        error_type=type(exc).__name__,
        path=request.url.path
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "internal_error",
                "message": "An unexpected error occurred",
                "details": None
            }
        }
    )


class SlicerUnavailableError(GeometryAnalysisError):
    """Raised when the slicer executable cannot be run."""

    def __init__(self, message: str, details: Any = None):
        super().__init__(message, "slicer_unavailable", details)


class SlicingTimeoutError(GeometryAnalysisError):
    """Raised when slicing exceeds the configured time budget."""

    def __init__(self, message: str, details: Any = None):
        super().__init__(message, "slicing_timeout", details)


class SlicingFailedError(GeometryAnalysisError):
    """Raised when the slicer rejects the model or settings."""

    def __init__(self, message: str, code: str = "slicing_failed", details: Any = None):
        super().__init__(message, code, details)
