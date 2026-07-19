from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from typing import Optional
from datetime import datetime
import structlog

from app.config import settings
from app.models import AnalysisCreate, AnalysisUpdate, GeometryAnalysisResponse, AnalysisStatus


class GeometryAnalysisRepository:
    """Repository for geometry analysis records."""

    def __init__(self):
        self.engine = create_async_engine(
            settings.database_url,
            echo=settings.debug,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20
        )
        self.async_session = async_sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        self.logger = structlog.get_logger(__name__)

    async def create_analysis(self, input: AnalysisCreate) -> GeometryAnalysisResponse:
        """Create a new analysis record."""
        async with self.async_session() as session:
            analysis_id = text("gen_random_uuid()").execution_options(autocommit=True)
            
            query = text("""
                INSERT INTO geometry_analyses (
                    id, model_file_id, tenant_id, storage_key, storage_bucket, status
                ) VALUES (
                    gen_random_uuid(), :model_file_id, :tenant_id, :storage_key, 
                    COALESCE(:storage_bucket, :default_bucket), 'pending'
                )
                RETURNING id, model_file_id, tenant_id, storage_key, storage_bucket, 
                          status, metrics, quality, complexity, error_message, 
                          created_at, updated_at, completed_at
            """)
            
            result = await session.execute(query, {
                "model_file_id": input.model_file_id,
                "tenant_id": input.tenant_id,
                "storage_key": input.storage_key,
                "storage_bucket": input.storage_bucket,
                "default_bucket": settings.storage_bucket
            })
            row = result.fetchone()
            await session.commit()
            
            return self._row_to_response(row)

    async def get_analysis(self, analysis_id: str, tenant_id: str) -> Optional[GeometryAnalysisResponse]:
        """Get an analysis by ID and tenant."""
        async with self.async_session() as session:
            query = text("""
                SELECT id, model_file_id, tenant_id, storage_key, storage_bucket, 
                       status, metrics, quality, complexity, error_message, 
                       created_at, updated_at, completed_at
                FROM geometry_analyses
                WHERE id = :analysis_id AND tenant_id = :tenant_id
            """)
            
            result = await session.execute(query, {
                "analysis_id": analysis_id,
                "tenant_id": tenant_id
            })
            row = result.fetchone()
            
            return self._row_to_response(row) if row else None

    async def update_analysis(
        self, 
        analysis_id: str, 
        tenant_id: str, 
        update: AnalysisUpdate
    ) -> Optional[GeometryAnalysisResponse]:
        """Update an analysis record."""
        async with self.async_session() as session:
            query = text("""
                UPDATE geometry_analyses
                SET status = :status,
                    metrics = COALESCE(:metrics, metrics),
                    quality = COALESCE(:quality, quality),
                    complexity = COALESCE(:complexity, complexity),
                    error_message = COALESCE(:error_message, error_message),
                    completed_at = COALESCE(:completed_at, completed_at),
                    updated_at = now()
                WHERE id = :analysis_id AND tenant_id = :tenant_id
                RETURNING id, model_file_id, tenant_id, storage_key, storage_bucket, 
                          status, metrics, quality, complexity, error_message, 
                          created_at, updated_at, completed_at
            """)
            
            result = await session.execute(query, {
                "analysis_id": analysis_id,
                "tenant_id": tenant_id,
                "status": update.status.value,
                "metrics": update.metrics,
                "quality": update.quality,
                "complexity": update.complexity,
                "error_message": update.error_message,
                "completed_at": update.completed_at
            })
            row = result.fetchone()
            await session.commit()
            
            return self._row_to_response(row) if row else None

    async def get_by_model_file(self, model_file_id: str, tenant_id: str) -> Optional[GeometryAnalysisResponse]:
        """Get the latest analysis for a model file."""
        async with self.async_session() as session:
            query = text("""
                SELECT id, model_file_id, tenant_id, storage_key, storage_bucket, 
                       status, metrics, quality, complexity, error_message, 
                       created_at, updated_at, completed_at
                FROM geometry_analyses
                WHERE model_file_id = :model_file_id AND tenant_id = :tenant_id
                ORDER BY created_at DESC
                LIMIT 1
            """)
            
            result = await session.execute(query, {
                "model_file_id": model_file_id,
                "tenant_id": tenant_id
            })
            row = result.fetchone()
            
            return self._row_to_response(row) if row else None

    def _row_to_response(self, row) -> GeometryAnalysisResponse:
        """Convert database row to response model."""
        from app.models import GeometryMetrics, MeshQuality, ComplexityScore
        
        return GeometryAnalysisResponse(
            analysis_id=row[0],
            model_file_id=row[1],
            tenant_id=row[2],
            status=AnalysisStatus(row[5]),
            metrics=GeometryMetrics(**row[6]) if row[6] else None,
            quality=MeshQuality(**row[7]) if row[7] else None,
            complexity=ComplexityScore(**row[8]) if row[8] else None,
            error_message=row[9],
            created_at=row[10],
            updated_at=row[11],
            completed_at=row[12]
        )

    async def health_check(self) -> bool:
        """Check database connectivity."""
        try:
            async with self.async_session() as session:
                await session.execute(text("SELECT 1"))
                return True
        except Exception as e:
            self.logger.error("Database health check failed", error=str(e))
            return False
