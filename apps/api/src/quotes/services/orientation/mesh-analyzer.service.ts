import { Injectable, Logger } from '@nestjs/common';

interface Vertex {
  x: number;
  y: number;
  z: number;
}

interface Triangle {
  v1: Vertex;
  v2: Vertex;
  v3: Vertex;
  normal?: { x: number; y: number; z: number };
  area?: number;
}

interface MeshAnalysis {
  vertices: Vertex[];
  triangles: Triangle[];
  triangleCount: number;
  vertexCount: number;
  volume: number;
  surfaceArea: number;
  boundingBox: {
    min: Vertex;
    max: Vertex;
    center: Vertex;
    dimensions: Vertex;
  };
  centerOfMass: Vertex;
  principalAxes: {
    axis1: Vertex;
    axis2: Vertex;
    axis3: Vertex;
  };
  isManifold: boolean;
  hasDegenerateTriangles: boolean;
  meshDensity: number;
}

interface MeshAnalyzerConfig {
  minTriangleArea: number;
  maxAspectRatio: number;
  manifoldCheck: boolean;
}

@Injectable()
export class MeshAnalyzerService {
  private readonly logger = new Logger(MeshAnalyzerService.name);
  private readonly defaultConfig: MeshAnalyzerConfig = {
    minTriangleArea: 0.001,
    maxAspectRatio: 100,
    manifoldCheck: true,
  };

  analyzeMesh(triangles: Triangle[], config: Partial<MeshAnalyzerConfig> = {}): MeshAnalysis {
    const cfg = { ...this.defaultConfig, ...config };
    this.logger.log(`Analyzing mesh with ${triangles.length} triangles`);

    const vertices = this.extractVertices(triangles);
    const vertexCount = vertices.length;
    const triangleCount = triangles.length;

    const processedTriangles = this.calculateTriangleProperties(triangles);

    const hasDegenerateTriangles = this.checkDegenerateTriangles(
      processedTriangles,
      cfg.minTriangleArea,
    );

    const volume = this.calculateVolume(processedTriangles);

    const surfaceArea = this.calculateSurfaceArea(processedTriangles);

    const boundingBox = this.calculateBoundingBox(processedTriangles);

    const centerOfMass = this.calculateCenterOfMass(processedTriangles);

    const principalAxes = this.calculatePrincipalAxes(processedTriangles);

    const isManifold = cfg.manifoldCheck ? this.checkManifold(processedTriangles) : true;

    const volumeCm3 = volume / 1000;
    const meshDensity = volumeCm3 > 0 ? triangleCount / volumeCm3 : 0;

    return {
      vertices,
      triangles: processedTriangles,
      triangleCount,
      vertexCount,
      volume,
      surfaceArea,
      boundingBox,
      centerOfMass,
      principalAxes,
      isManifold,
      hasDegenerateTriangles,
      meshDensity,
    };
  }

  private extractVertices(triangles: Triangle[]): Vertex[] {
    const vertexMap = new Map<string, Vertex>();

    for (const tri of triangles) {
      for (const v of [tri.v1, tri.v2, tri.v3]) {
        const key = `${v.x.toFixed(6)},${v.y.toFixed(6)},${v.z.toFixed(6)}`;
        if (!vertexMap.has(key)) {
          vertexMap.set(key, { ...v });
        }
      }
    }

    return Array.from(vertexMap.values());
  }

  private calculateTriangleProperties(triangles: Triangle[]): Triangle[] {
    return triangles.map((tri) => {
      const edge1 = {
        x: tri.v2.x - tri.v1.x,
        y: tri.v2.y - tri.v1.y,
        z: tri.v2.z - tri.v1.z,
      };
      const edge2 = {
        x: tri.v3.x - tri.v1.x,
        y: tri.v3.y - tri.v1.y,
        z: tri.v3.z - tri.v1.z,
      };

      const normal = {
        x: edge1.y * edge2.z - edge1.z * edge2.y,
        y: edge1.z * edge2.x - edge1.x * edge2.z,
        z: edge1.x * edge2.y - edge1.y * edge2.x,
      };

      const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
      const normalizedNormal =
        length > 0
          ? { x: normal.x / length, y: normal.y / length, z: normal.z / length }
          : { x: 0, y: 0, z: 1 };

      const area = 0.5 * length;

      return {
        ...tri,
        normal: normalizedNormal,
        area,
      };
    });
  }

  private checkDegenerateTriangles(triangles: Triangle[], minArea: number): boolean {
    for (const tri of triangles) {
      if (tri.area !== undefined && tri.area < minArea) {
        return true;
      }
    }
    return false;
  }

  private calculateVolume(triangles: Triangle[]): number {
    let volume = 0;
    for (const tri of triangles) {
      const signedVolume =
        (tri.v1.x * (tri.v2.y * tri.v3.z - tri.v3.y * tri.v2.z) +
          tri.v2.x * (tri.v3.y * tri.v1.z - tri.v1.y * tri.v3.z) +
          tri.v3.x * (tri.v1.y * tri.v2.z - tri.v2.y * tri.v1.z)) /
        6;
      volume += signedVolume;
    }
    return Math.abs(volume);
  }

  private calculateSurfaceArea(triangles: Triangle[]): number {
    return triangles.reduce((sum, tri) => sum + (tri.area || 0), 0);
  }

  private calculateBoundingBox(triangles: Triangle[]): {
    min: Vertex;
    max: Vertex;
    center: Vertex;
    dimensions: Vertex;
  } {
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    for (const tri of triangles) {
      for (const v of [tri.v1, tri.v2, tri.v3]) {
        minX = Math.min(minX, v.x);
        minY = Math.min(minY, v.y);
        minZ = Math.min(minZ, v.z);
        maxX = Math.max(maxX, v.x);
        maxY = Math.max(maxY, v.y);
        maxZ = Math.max(maxZ, v.z);
      }
    }

    const center = {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      z: (minZ + maxZ) / 2,
    };

    const dimensions = {
      x: maxX - minX,
      y: maxY - minY,
      z: maxZ - minZ,
    };

    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      center,
      dimensions,
    };
  }

  private calculateCenterOfMass(triangles: Triangle[]): Vertex {
    let cx = 0,
      cy = 0,
      cz = 0;
    let totalArea = 0;

    for (const tri of triangles) {
      const centroid = {
        x: (tri.v1.x + tri.v2.x + tri.v3.x) / 3,
        y: (tri.v1.y + tri.v2.y + tri.v3.y) / 3,
        z: (tri.v1.z + tri.v2.z + tri.v3.z) / 3,
      };
      const area = tri.area || 0;

      cx += centroid.x * area;
      cy += centroid.y * area;
      cz += centroid.z * area;
      totalArea += area;
    }

    return {
      x: totalArea > 0 ? cx / totalArea : 0,
      y: totalArea > 0 ? cy / totalArea : 0,
      z: totalArea > 0 ? cz / totalArea : 0,
    };
  }

  private calculatePrincipalAxes(triangles: Triangle[]): {
    axis1: Vertex;
    axis2: Vertex;
    axis3: Vertex;
  } {
    const boundingBox = this.calculateBoundingBox(triangles);
    const dims = boundingBox.dimensions;

    const sortedDims = [
      { axis: 'x', value: dims.x },
      { axis: 'y', value: dims.y },
      { axis: 'z', value: dims.z },
    ].sort((a, b) => b.value - a.value);

    return {
      axis1: {
        x: sortedDims[0]?.axis === 'x' ? 1 : 0,
        y: sortedDims[0]?.axis === 'y' ? 1 : 0,
        z: sortedDims[0]?.axis === 'z' ? 1 : 0,
      },
      axis2: {
        x: sortedDims[1]?.axis === 'x' ? 1 : 0,
        y: sortedDims[1]?.axis === 'y' ? 1 : 0,
        z: sortedDims[1]?.axis === 'z' ? 1 : 0,
      },
      axis3: {
        x: sortedDims[2]?.axis === 'x' ? 1 : 0,
        y: sortedDims[2]?.axis === 'y' ? 1 : 0,
        z: sortedDims[2]?.axis === 'z' ? 1 : 0,
      },
    };
  }

  private checkManifold(triangles: Triangle[]): boolean {
    const edgeCount = new Map<string, number>();

    for (const tri of triangles) {
      const edges = [
        this.edgeKey(tri.v1, tri.v2),
        this.edgeKey(tri.v2, tri.v3),
        this.edgeKey(tri.v3, tri.v1),
      ];

      for (const edge of edges) {
        edgeCount.set(edge, (edgeCount.get(edge) || 0) + 1);
      }
    }

    for (const count of edgeCount.values()) {
      if (count !== 2) {
        return false;
      }
    }

    return true;
  }

  private edgeKey(v1: Vertex, v2: Vertex): string {
    const key1 = `${v1.x.toFixed(6)},${v1.y.toFixed(6)},${v1.z.toFixed(6)}`;
    const key2 = `${v2.x.toFixed(6)},${v2.y.toFixed(6)},${v2.z.toFixed(6)}`;
    return key1 < key2 ? `${key1}-${key2}` : `${key2}-${key1}`;
  }
}
