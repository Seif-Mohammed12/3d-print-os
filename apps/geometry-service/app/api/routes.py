from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Optional
from datetime import datetime
import structlog

from app.models import (
    GeometryAnalysisRequest,
    GeometryAnalysisResponse,
    AnalysisStatus,
    AnalysisUpdate,
    HealthResponse
)
from app.database.repository import GeometryAnalysisRepository
from app.geometry.analyzer import GeometryAnalyzer
from app.storage.client import StorageClient


router = APIRouter()
logger = structlog.get_logger(__name__)


# Initialize components
repo = GeometryAnalysisRepository()
analyzer = GeometryAnalyzer(max_triangles=1000000)
storage_client = StorageClient()


async def perform_analysis(
    analysis_id: str,
    tenant_id: str,
    storage_key: str,
    storage_bucket: Optional[str]
):
    """Background task to perform geometry analysis."""
    try:
        logger.info(
            "Starting background analysis",
            analysis_id=analysis_id,
            tenant_id=tenant_id
        )
        
        # Update status to processing
        await repo.update_analysis(
            analysis_id,
            tenant_id,
            AnalysisUpdate(status=AnalysisStatus.PROCESSING)
        )
        
        # Fetch STL file
        stl_bytes = await storage_client.fetch_stl_bytes(storage_key, storage_bucket)
        
        # Perform analysis
        metrics, quality, complexity = await analyzer.analyze_stl_bytes(stl_bytes)
        
        # Update with results
        await repo.update_analysis(
            analysis_id,
            tenant_id,
            AnalysisUpdate(
                status=AnalysisStatus.COMPLETED,
                metrics=metrics.model_dump(),
                quality=quality.model_dump(),
                complexity=complexity.model_dump(),
                completed_at=datetime.utcnow()
            )
        )
        
        logger.info(
            "Analysis completed successfully",
            analysis_id=analysis_id,
            tenant_id=tenant_id
        )
        
    except Exception as e:
        logger.error(
            "Analysis failed",
            analysis_id=analysis_id,
            tenant_id=tenant_id,
            error=str(e)
        )
        
        # Update with error
        await repo.update_analysis(
            analysis_id,
            tenant_id,
            AnalysisUpdate(
                status=AnalysisStatus.FAILED,
                error_message=str(e)
            )
        )


@router.post("/analyze", response_model=GeometryAnalysisResponse)
async def create_analysis(
    request: GeometryAnalysisRequest,
    background_tasks: BackgroundTasks
):
    """
    Create a new geometry analysis request.
    
    This endpoint accepts a model file ID and triggers asynchronous analysis.
    The analysis runs in the background and results can be retrieved via GET.
    """
    try:
        logger.info(
            "Creating analysis request",
            model_file_id=request.model_file_id,
            tenant_id=request.tenant_id
        )
        
        # Create analysis record
        analysis = await repo.create_analysis(
            AnalysisCreate(
                model_file_id=request.model_file_id,
                tenant_id=request.tenant_id,
                storage_key=request.storage_key,
                storage_bucket=request.storage_bucket
            )
        )
        
        # Queue background analysis
        background_tasks.add_task(
            perform_analysis,
            analysis.analysis_id,
            analysis.tenant_id,
            analysis.storage_key,
            analysis.storage_bucket
        )
        
        return analysis
        
    except Exception as e:
        logger.error("Failed to create analysis", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to create analysis: {str(e)}")


@router.post("/analyze/upload", response_model=GeometryAnalysisResponse)
async def analyze_uploaded_file(
    file: UploadFile = File(...),
    model_file_id: str = Form(...),
    tenant_id: str = Form(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Analyze an STL file uploaded directly.
    
    This endpoint accepts the STL file directly in the request body.
    Useful for testing or when storage integration is not available.
    """
    try:
        logger.info(
            "Analyzing uploaded file",
            model_file_id=model_file_id,
            tenant_id=tenant_id,
            filename=file.filename
        )
        
        # Validate file size
        content = await file.read()
        if len(content) > 100 * 1024 * 1024:  # 100MB
            raise HTTPException(status_code=413, detail="File too large")
        
        # Create analysis record with dummy storage key
        analysis = await repo.create_analysis(
            AnalysisCreate(
                model_file_id=model_file_id,
                tenant_id=tenant_id,
                storage_key=f"upload/{model_file_id}/{file.filename}",
                storage_bucket=None
            )
        )
        
        # Perform analysis immediately (since we have the file)
        try:
            metrics, quality, complexity = await analyzer.analyze_stl_bytes(content)
            
            await repo.update_analysis(
                analysis.analysis_id,
                analysis.tenant_id,
                AnalysisUpdate(
                    status=AnalysisStatus.COMPLETED,
                    metrics=metrics.model_dump(),
                    quality=quality.model_dump(),
                    complexity=complexity.model_dump(),
                    completed_at=datetime.utcnow()
                )
            )
            
            # Return updated analysis
            updated = await repo.get_analysis(analysis.analysis_id, analysis.tenant_id)
            return updated
            
        except Exception as e:
            logger.error("Analysis failed", error=str(e))
            await repo.update_analysis(
                analysis.analysis_id,
                analysis.tenant_id,
                AnalysisUpdate(
                    status=AnalysisStatus.FAILED,
                    error_message=str(e)
                )
            )
            raise HTTPException(status_code=422, detail=f"Analysis failed: {str(e)}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to analyze uploaded file", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to analyze file: {str(e)}")


@router.get("/analyze/{analysis_id}", response_model=GeometryAnalysisResponse)
async def get_analysis(analysis_id: str, tenant_id: str):
    """
    Get geometry analysis results by ID.
    """
    try:
        analysis = await repo.get_analysis(analysis_id, tenant_id)
        
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        return analysis
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get analysis", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get analysis: {str(e)}")


@router.get("/model/{model_file_id}", response_model=GeometryAnalysisResponse)
async def get_analysis_by_model(model_file_id: str, tenant_id: str):
    """
    Get the latest analysis for a model file.
    """
    try:
        analysis = await repo.get_by_model_file(model_file_id, tenant_id)
        
        if not analysis:
            raise HTTPException(status_code=404, detail="No analysis found for model")
        
        return analysis
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get analysis by model", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get analysis: {str(e)}")


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    """
    db_healthy = await repo.health_check()
    
    status = "healthy" if db_healthy else "unhealthy"
    
    return HealthResponse(
        status=status,
        service="geometry-analysis-service",
        timestamp=datetime.utcnow()
    )
