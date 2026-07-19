import pytest
import numpy as np
from app.geometry.analyzer import GeometryAnalyzer
from app.models import GeometryMetrics, MeshQuality, ComplexityScore


@pytest.fixture
def analyzer():
    """Create a GeometryAnalyzer instance."""
    return GeometryAnalyzer(max_triangles=1000000)


@pytest.fixture
def sample_cube_stl():
    """Create a simple cube STL for testing."""
    import trimesh
    
    # Create a simple cube
    cube = trimesh.creation.box(extents=[10.0, 10.0, 10.0])
    return cube.export(file_type='stl')


class TestGeometryAnalyzer:
    """Test suite for GeometryAnalyzer."""

    @pytest.mark.asyncio
    async def test_analyze_valid_stl(self, analyzer, sample_cube_stl):
        """Test analyzing a valid STL file."""
        metrics, quality, complexity = await analyzer.analyze_stl_bytes(sample_cube_stl)
        
        # Verify metrics
        assert isinstance(metrics, GeometryMetrics)
        assert metrics.width_mm > 0
        assert metrics.height_mm > 0
        assert metrics.depth_mm > 0
        assert metrics.volume_mm3 > 0
        assert metrics.surface_area_mm2 > 0
        assert metrics.triangle_count > 0
        
        # Verify quality
        assert isinstance(quality, MeshQuality)
        assert quality.is_watertight  # Cube should be watertight
        assert quality.is_manifold
        assert not quality.has_duplicate_faces
        
        # Verify complexity
        assert isinstance(complexity, ComplexityScore)
        assert 0 <= complexity.complexity_score <= 100
        assert 0 <= complexity.printability_score <= 100
        assert isinstance(complexity.complexity_factors, dict)
        assert isinstance(complexity.printability_issues, list)

    @pytest.mark.asyncio
    async def test_analyze_invalid_data(self, analyzer):
        """Test analyzing invalid data."""
        with pytest.raises(ValueError, match="STL analysis failed"):
            await analyzer.analyze_stl_bytes(b"invalid stl data")

    @pytest.mark.asyncio
    async def test_triangle_count_limit(self, analyzer):
        """Test triangle count limit enforcement."""
        import trimesh
        
        # Create a mesh with many triangles
        sphere = trimesh.creation.icosphere(subdivisions=5)
        stl_data = sphere.export(file_type='stl')
        
        # This should exceed the limit
        with pytest.raises(ValueError, match="exceeds maximum triangle count"):
            await analyzer.analyze_stl_bytes(stl_data)

    def test_compute_metrics(self, analyzer):
        """Test metric computation."""
        import trimesh
        
        cube = trimesh.creation.box(extents=[10.0, 20.0, 30.0])
        metrics = analyzer._compute_metrics(cube)
        
        assert metrics.width_mm == pytest.approx(10.0, abs=0.1)
        assert metrics.height_mm == pytest.approx(20.0, abs=0.1)
        assert metrics.depth_mm == pytest.approx(30.0, abs=0.1)
        assert metrics.volume_mm3 == pytest.approx(6000.0, abs=1.0)
        assert metrics.surface_area_mm2 > 0
        assert metrics.triangle_count == 12  # Cube has 12 triangles

    def test_compute_quality(self, analyzer):
        """Test quality computation."""
        import trimesh
        
        cube = trimesh.creation.box(extents=[10.0, 10.0, 10.0])
        quality = analyzer._compute_quality(cube)
        
        assert quality.is_watertight
        assert quality.is_manifold
        assert not quality.has_duplicate_faces
        assert quality.euler_characteristic == 2  # Euler characteristic for a cube

    def test_compute_complexity(self, analyzer):
        """Test complexity computation."""
        import trimesh
        
        cube = trimesh.creation.box(extents=[10.0, 10.0, 10.0])
        metrics = analyzer._compute_metrics(cube)
        quality = analyzer._compute_quality(cube)
        complexity = analyzer._compute_complexity(cube, metrics, quality)
        
        assert 0 <= complexity.complexity_score <= 100
        assert 0 <= complexity.printability_score <= 100
        assert 'triangle_count' in complexity.complexity_factors
        assert 'volume' in complexity.complexity_factors
        assert 'aspect_ratio' in complexity.complexity_factors


class TestComplexityScoring:
    """Test complexity and printability scoring logic."""

    def test_perfect_mesh_printability(self, analyzer):
        """Test that a perfect watertight cube has high printability."""
        import trimesh
        
        cube = trimesh.creation.box(extents=[10.0, 10.0, 10.0])
        metrics = analyzer._compute_metrics(cube)
        quality = analyzer._compute_quality(cube)
        complexity = analyzer._compute_complexity(cube, metrics, quality)
        
        # Perfect cube should have very high printability
        assert complexity.printability_score >= 90
        assert len(complexity.printability_issues) == 0

    def test_non_watertight_penalty(self, analyzer):
        """Test that non-watertight meshes get penalized."""
        import trimesh
        
        # Create a mesh with holes
        mesh = trimesh.creation.box(extents=[10.0, 10.0, 10.0])
        mesh.faces = mesh.faces[:-2]  # Remove some faces to create holes
        
        metrics = analyzer._compute_metrics(mesh)
        quality = analyzer._compute_quality(mesh)
        complexity = analyzer._compute_complexity(mesh, metrics, quality)
        
        # Should have lower printability due to holes
        assert complexity.printability_score < 90
        assert any("watertight" in issue.lower() for issue in complexity.printability_issues)

    def test_extreme_aspect_ratio_penalty(self, analyzer):
        """Test that extreme aspect ratios get penalized."""
        import trimesh
        
        # Create a very flat mesh
        flat_mesh = trimesh.creation.box(extents=[100.0, 1.0, 1.0])
        metrics = analyzer._compute_metrics(flat_mesh)
        quality = analyzer._compute_quality(flat_mesh)
        complexity = analyzer._compute_complexity(flat_mesh, metrics, quality)
        
        # Should have lower printability due to aspect ratio
        assert complexity.printability_score < 90
        assert any("aspect ratio" in issue.lower() for issue in complexity.printability_issues)
