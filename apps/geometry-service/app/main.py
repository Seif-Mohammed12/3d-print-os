from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog

from app.config import settings
from app.logging import configure_logging
from app.api.routes import router
from app.api.slicing_routes import router as slicing_router
from app.exceptions import (
    GeometryAnalysisError,
    geometry_analysis_exception_handler,
    generic_exception_handler
)


# Configure logging
logger = configure_logging(
    service_name=settings.service_name,
    environment=settings.environment,
    debug=settings.debug
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info(
        "Starting geometry analysis service",
        environment=settings.environment,
        debug=settings.debug
    )
    yield
    logger.info("Shutting down geometry analysis service")


# Create FastAPI application
app = FastAPI(
    title="Geometry Analysis Service",
    description="STL file geometry analysis for 3D Print OS",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix=settings.api_prefix)
app.include_router(slicing_router, prefix=settings.api_prefix)

# Exception handlers
app.add_exception_handler(GeometryAnalysisError, geometry_analysis_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": settings.service_name,
        "version": "1.0.0",
        "status": "running"
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_config=None  # Use structlog instead
    )
