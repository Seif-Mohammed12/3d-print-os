from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class AnalysisStatus(str, Enum):
    """Status of geometry analysis."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class GeometryAnalysisRequest(BaseModel):
    """Request to analyze an STL file."""
    model_file_id: str = Field(..., description="ID of the model file to analyze")
    tenant_id: str = Field(..., description="Tenant ID for multi-tenancy")
    storage_key: str = Field(..., description="Storage key to fetch the STL file")
    storage_bucket: Optional[str] = Field(None, description="Storage bucket (overrides default)")


class GeometryMetrics(BaseModel):
    """Core geometry metrics from STL analysis."""
    width_mm: float = Field(..., description="Width in millimeters")
    height_mm: float = Field(..., description="Height in millimeters")
    depth_mm: float = Field(..., description="Depth in millimeters")
    volume_mm3: float = Field(..., description="Volume in cubic millimeters")
    surface_area_mm2: float = Field(..., description="Surface area in square millimeters")
    triangle_count: int = Field(..., description="Number of triangles in mesh")


class MeshQuality(BaseModel):
    """Mesh quality indicators."""
    is_watertight: bool = Field(..., description="Whether mesh is watertight (no holes)")
    is_manifold: bool = Field(..., description="Whether mesh is manifold (no non-manifold edges)")
    has_duplicate_faces: bool = Field(..., description="Whether mesh has duplicate faces")
    has_self_intersections: bool = Field(..., description="Whether mesh has self-intersections")
    has_degenerate_faces: bool = Field(..., description="Whether mesh has degenerate faces")
    euler_characteristic: int = Field(..., description="Euler characteristic (V - E + F)")
    non_manifold_edges: int = Field(..., description="Count of non-manifold edges")
    non_manifold_vertices: int = Field(..., description="Count of non-manifold vertices")


class ComplexityScore(BaseModel):
    """Complexity and printability assessment."""
    complexity_score: float = Field(..., ge=0.0, le=100.0, description="Complexity score (0-100)")
    printability_score: float = Field(..., ge=0.0, le=100.0, description="Printability score (0-100)")
    complexity_factors: dict = Field(default_factory=dict, description="Factors contributing to complexity")
    printability_issues: list[str] = Field(default_factory=list, description="Issues affecting printability")


class GeometryAnalysisResponse(BaseModel):
    """Complete geometry analysis response."""
    analysis_id: str
    model_file_id: str
    tenant_id: str
    status: AnalysisStatus
    metrics: Optional[GeometryMetrics] = None
    quality: Optional[MeshQuality] = None
    complexity: Optional[ComplexityScore] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None


class AnalysisCreate(BaseModel):
    """Database model for creating analysis record."""
    model_file_id: str
    tenant_id: str
    storage_key: str
    storage_bucket: Optional[str] = None


class AnalysisUpdate(BaseModel):
    """Database model for updating analysis record."""
    status: AnalysisStatus
    metrics: Optional[dict] = None
    quality: Optional[dict] = None
    complexity: Optional[dict] = None
    error_message: Optional[str] = None
    completed_at: Optional[datetime] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str = "1.0.0"
    timestamp: datetime
