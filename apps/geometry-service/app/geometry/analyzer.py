import trimesh
import numpy as np
from typing import Optional, Tuple
import structlog

from app.models import GeometryMetrics, MeshQuality, ComplexityScore


class GeometryAnalyzer:
    """Analyzes STL files using trimesh."""

    def __init__(self, max_triangles: int = 1000000):
        """
        Initialize the geometry analyzer.
        
        Args:
            max_triangles: Maximum allowed triangles for safety
        """
        self.max_triangles = max_triangles
        self.logger = structlog.get_logger(__name__)

    async def analyze_stl_bytes(self, stl_bytes: bytes) -> Tuple[GeometryMetrics, MeshQuality, ComplexityScore]:
        """
        Analyze STL file from bytes.
        
        Args:
            stl_bytes: Raw STL file bytes
            
        Returns:
            Tuple of (metrics, quality, complexity)
            
        Raises:
            ValueError: If file is invalid or exceeds limits
        """
        try:
            # Load mesh from bytes
            mesh = trimesh.load(
                file_obj=stl_bytes,
                file_type='stl',
                force='mesh'
            )
            
            if not isinstance(mesh, trimesh.Trimesh):
                raise ValueError("Loaded file is not a valid mesh")
                
            # Check triangle count
            if len(mesh.faces) > self.max_triangles:
                raise ValueError(f"Mesh exceeds maximum triangle count: {len(mesh.faces)} > {self.max_triangles}")
            
            self.logger.info(
                "Mesh loaded successfully",
                vertices=len(mesh.vertices),
                faces=len(mesh.faces),
                volume=mesh.volume
            )
            
            # Compute metrics
            metrics = self._compute_metrics(mesh)
            
            # Compute quality
            quality = self._compute_quality(mesh)
            
            # Compute complexity
            complexity = self._compute_complexity(mesh, metrics, quality)
            
            return metrics, quality, complexity
            
        except Exception as e:
            self.logger.error("Failed to analyze STL", error=str(e))
            raise ValueError(f"STL analysis failed: {str(e)}")

    def _compute_metrics(self, mesh: trimesh.Trimesh) -> GeometryMetrics:
        """Compute basic geometry metrics."""
        # Get bounding box dimensions in millimeters (assuming STL is in mm)
        bounds = mesh.bounds
        dimensions = bounds[1] - bounds[0]  # max - min for each axis
        
        width_mm = float(dimensions[0])
        height_mm = float(dimensions[1])
        depth_mm = float(dimensions[2])
        
        # Volume and surface area
        volume_mm3 = float(mesh.volume)
        surface_area_mm2 = float(mesh.area)
        
        # Triangle count
        triangle_count = len(mesh.faces)
        
        return GeometryMetrics(
            width_mm=width_mm,
            height_mm=height_mm,
            depth_mm=depth_mm,
            volume_mm3=volume_mm3,
            surface_area_mm2=surface_area_mm2,
            triangle_count=triangle_count
        )

    def _compute_quality(self, mesh: trimesh.Trimesh) -> MeshQuality:
        """Compute mesh quality indicators."""
        # Watertight check
        is_watertight = mesh.is_watertight
        
        # Manifold check
        is_manifold = mesh.is_watertight  # trimesh uses watertight as manifold proxy
        
        # Duplicate faces
        has_duplicate_faces = mesh.has_duplicate_faces
        
        # Self intersections
        has_self_intersections = False
        try:
            has_self_intersections = mesh.intersections.any() if hasattr(mesh, 'intersections') else False
        except Exception:
            # Self-intersection check can be expensive, skip if fails
            pass
        
        # Degenerate faces (zero area)
        face_areas = mesh.area_faces
        has_degenerate_faces = np.any(face_areas < 1e-10)
        
        # Euler characteristic: V - E + F
        euler_characteristic = mesh.euler_number
        
        # Non-manifold edges and vertices
        non_manifold_edges = 0
        non_manifold_vertices = 0
        try:
            if hasattr(mesh, 'edges_unique'):
                edge_counts = np.bincount(mesh.edges_unique.flatten())
                non_manifold_edges = int(np.sum(edge_counts > 2))
            
            if hasattr(mesh, 'vertices'):
                vertex_counts = np.bincount(mesh.vertices.shape[0])
                non_manifold_vertices = int(np.sum(vertex_counts > 2))
        except Exception:
            pass
        
        return MeshQuality(
            is_watertight=is_watertight,
            is_manifold=is_manifold,
            has_duplicate_faces=has_duplicate_faces,
            has_self_intersections=has_self_intersections,
            has_degenerate_faces=has_degenerate_faces,
            euler_characteristic=euler_characteristic,
            non_manifold_edges=non_manifold_edges,
            non_manifold_vertices=non_manifold_vertices
        )

    def _compute_complexity(
        self, 
        mesh: trimesh.Trimesh, 
        metrics: GeometryMetrics,
        quality: MeshQuality
    ) -> ComplexityScore:
        """Compute complexity and printability scores."""
        factors = {}
        issues = []
        
        # Complexity factors
        factors['triangle_count'] = metrics.triangle_count
        factors['volume'] = metrics.volume_mm3
        factors['surface_area'] = metrics.surface_area_mm2
        factors['aspect_ratio'] = max(metrics.width_mm, metrics.height_mm, metrics.depth_mm) / \
                                 min(metrics.width_mm, metrics.height_mm, metrics.depth_mm)
        
        # Base complexity from triangle count (logarithmic scale)
        triangle_complexity = min(100, (np.log10(metrics.triangle_count + 1) / np.log10(self.max_triangles)) * 100)
        
        # Volume complexity (larger = more complex)
        volume_complexity = min(100, (metrics.volume_mm3 / 1_000_000) * 20)  # 1M mm³ = 100% complexity
        
        # Aspect ratio penalty
        aspect_ratio = factors['aspect_ratio']
        aspect_penalty = min(30, (aspect_ratio - 1) * 5) if aspect_ratio > 1 else 0
        
        # Overall complexity score
        complexity_score = min(100, triangle_complexity * 0.5 + volume_complexity * 0.3 + aspect_penalty)
        factors['complexity_breakdown'] = {
            'triangles': triangle_complexity,
            'volume': volume_complexity,
            'aspect_ratio': aspect_penalty
        }
        
        # Printability score
        printability_score = 100.0
        
        # Watertight penalty
        if not quality.is_watertight:
            printability_score -= 30
            issues.append("Mesh is not watertight (has holes)")
        
        # Manifold penalty
        if not quality.is_manifold:
            printability_score -= 20
            issues.append("Mesh has non-manifold geometry")
        
        # Duplicate faces penalty
        if quality.has_duplicate_faces:
            printability_score -= 10
            issues.append("Mesh has duplicate faces")
        
        # Self-intersections penalty
        if quality.has_self_intersections:
            printability_score -= 25
            issues.append("Mesh has self-intersections")
        
        # Degenerate faces penalty
        if quality.has_degenerate_faces:
            printability_score -= 5
            issues.append("Mesh has degenerate faces")
        
        # Size penalties
        if metrics.volume_mm3 < 1:  # Too small
            printability_score -= 10
            issues.append("Model is very small (< 1mm³)")
        elif metrics.volume_mm3 > 500_000_000:  # Too large (> 500L)
            printability_score -= 20
            issues.append("Model is very large (> 500L)")
        
        # Aspect ratio penalty
        if aspect_ratio > 10:
            printability_score -= 15
            issues.append(f"Model has extreme aspect ratio ({aspect_ratio:.1f})")
        
        # Ensure score is in valid range
        printability_score = max(0, min(100, printability_score))
        
        return ComplexityScore(
            complexity_score=round(complexity_score, 2),
            printability_score=round(printability_score, 2),
            complexity_factors=factors,
            printability_issues=issues
        )
