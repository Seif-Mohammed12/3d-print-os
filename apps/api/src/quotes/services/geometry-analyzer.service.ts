import { Injectable, Logger } from '@nestjs/common';

interface Triangle {
  v1: { x: number; y: number; z: number };
  v2: { x: number; y: number; z: number };
  v3: { x: number; y: number; z: number };
}

interface GeometryAnalysis {
  volumeMm3: number;
  surfaceAreaMm2: number;
  boundingBox: { x: number; y: number; z: number };
  triangleCount: number;
  faceNormals: Array<{ x: number; y: number; z: number }>;
  meshComplexity: number;
  surfaceToVolumeRatio: number;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
}

interface OverhangAnalysis {
  overhangAreaMm2: number;
  overhangPercentage: number;
  criticalOverhangs: Array<{ faceIndex: number; angle: number; area: number }>;
}

@Injectable()
export class GeometryAnalyzerService {
  private readonly logger = new Logger(GeometryAnalyzerService.name);

  analyzeGeometry(triangles: Triangle[]): GeometryAnalysis {
    this.logger.log(`Analyzing geometry for ${triangles.length} triangles`);

    if (triangles.length === 0) {
      throw new Error('No triangles to analyze');
    }

    const volumeMm3 = this.calculateVolume(triangles);
    const surfaceAreaMm2 = this.calculateSurfaceArea(triangles);
    const boundingBox = this.calculateBoundingBox(triangles);
    const faceNormals = this.calculateFaceNormals(triangles);
    const meshComplexity = this.calculateMeshComplexity(triangles, surfaceAreaMm2);
    const surfaceToVolumeRatio = surfaceAreaMm2 / volumeMm3;
    const dimensions = this.calculateDimensions(boundingBox);

    return {
      volumeMm3: Math.round(volumeMm3),
      surfaceAreaMm2: Math.round(surfaceAreaMm2),
      boundingBox,
      triangleCount: triangles.length,
      faceNormals,
      meshComplexity,
      surfaceToVolumeRatio,
      dimensions,
    };
  }

  analyzeOverhangs(triangles: Triangle[], overhangAngleThreshold = 45): OverhangAnalysis {
    this.logger.log(`Analyzing overhangs with threshold ${overhangAngleThreshold}°`);

    const faceNormals = this.calculateFaceNormals(triangles);
    const faceAreas = this.calculateFaceAreas(triangles);

    let overhangAreaMm2 = 0;
    const criticalOverhangs: Array<{ faceIndex: number; angle: number; area: number }> = [];

    faceNormals.forEach((normal, index) => {
      // Calculate angle from vertical (Z-axis)
      const angleFromVertical = Math.acos(normal.z) * (180 / Math.PI);

      // Overhang is when face normal points downward beyond threshold
      if (angleFromVertical > overhangAngleThreshold) {
        const area = faceAreas[index] || 0;
        overhangAreaMm2 += area;

        criticalOverhangs.push({
          faceIndex: index,
          angle: angleFromVertical,
          area,
        });
      }
    });

    const totalSurfaceArea = this.calculateSurfaceArea(triangles);
    const overhangPercentage = (overhangAreaMm2 / totalSurfaceArea) * 100;

    return {
      overhangAreaMm2: Math.round(overhangAreaMm2),
      overhangPercentage: Math.round(overhangPercentage * 100) / 100,
      criticalOverhangs,
    };
  }

  private calculateVolume(triangles: Triangle[]): number {
    // Using signed tetrahedron method for volume calculation
    let volume = 0;

    for (const tri of triangles) {
      const v1 = tri.v1;
      const v2 = tri.v2;
      const v3 = tri.v3;

      // Signed volume of tetrahedron formed by triangle and origin
      const signedVolume =
        (v1.x * (v2.y * v3.z - v2.z * v3.y) +
          v1.y * (v2.z * v3.x - v2.x * v3.z) +
          v1.z * (v2.x * v3.y - v2.y * v3.x)) /
        6;

      volume += signedVolume;
    }

    return Math.abs(volume);
  }

  private calculateSurfaceArea(triangles: Triangle[]): number {
    let surfaceArea = 0;

    for (const tri of triangles) {
      const v1 = tri.v1;
      const v2 = tri.v2;
      const v3 = tri.v3;

      // Calculate edge vectors
      const edge1 = {
        x: v2.x - v1.x,
        y: v2.y - v1.y,
        z: v2.z - v1.z,
      };
      const edge2 = {
        x: v3.x - v1.x,
        y: v3.y - v1.y,
        z: v3.z - v1.z,
      };

      // Cross product for area
      const cross = {
        x: edge1.y * edge2.z - edge1.z * edge2.y,
        y: edge1.z * edge2.x - edge1.x * edge2.z,
        z: edge1.x * edge2.y - edge1.y * edge2.x,
      };

      const area = 0.5 * Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
      surfaceArea += area;
    }

    return surfaceArea;
  }

  private calculateBoundingBox(triangles: Triangle[]): { x: number; y: number; z: number } {
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    for (const tri of triangles) {
      minX = Math.min(minX, tri.v1.x, tri.v2.x, tri.v3.x);
      minY = Math.min(minY, tri.v1.y, tri.v2.y, tri.v3.y);
      minZ = Math.min(minZ, tri.v1.z, tri.v2.z, tri.v3.z);
      maxX = Math.max(maxX, tri.v1.x, tri.v2.x, tri.v3.x);
      maxY = Math.max(maxY, tri.v1.y, tri.v2.y, tri.v3.y);
      maxZ = Math.max(maxZ, tri.v1.z, tri.v2.z, tri.v3.z);
    }

    return {
      x: maxX - minX,
      y: maxY - minY,
      z: maxZ - minZ,
    };
  }

  private calculateFaceNormals(triangles: Triangle[]): Array<{ x: number; y: number; z: number }> {
    const normals: Array<{ x: number; y: number; z: number }> = [];

    for (const tri of triangles) {
      const v1 = tri.v1;
      const v2 = tri.v2;
      const v3 = tri.v3;

      // Calculate edge vectors
      const edge1 = {
        x: v2.x - v1.x,
        y: v2.y - v1.y,
        z: v2.z - v1.z,
      };
      const edge2 = {
        x: v3.x - v1.x,
        y: v3.y - v1.y,
        z: v3.z - v1.z,
      };

      // Cross product for normal
      const normal = {
        x: edge1.y * edge2.z - edge1.z * edge2.y,
        y: edge1.z * edge2.x - edge1.x * edge2.z,
        z: edge1.x * edge2.y - edge1.y * edge2.x,
      };

      // Normalize
      const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
      if (length > 0) {
        normals.push({
          x: normal.x / length,
          y: normal.y / length,
          z: normal.z / length,
        });
      } else {
        normals.push({ x: 0, y: 0, z: 1 }); // Default to up
      }
    }

    return normals;
  }

  private calculateFaceAreas(triangles: Triangle[]): number[] {
    const areas: number[] = [];

    for (const tri of triangles) {
      const v1 = tri.v1;
      const v2 = tri.v2;
      const v3 = tri.v3;

      const edge1 = {
        x: v2.x - v1.x,
        y: v2.y - v1.y,
        z: v2.z - v1.z,
      };
      const edge2 = {
        x: v3.x - v1.x,
        y: v3.y - v1.y,
        z: v3.z - v1.z,
      };

      const cross = {
        x: edge1.y * edge2.z - edge1.z * edge2.y,
        y: edge1.z * edge2.x - edge1.x * edge2.z,
        z: edge1.x * edge2.y - edge1.y * edge2.x,
      };

      const area = 0.5 * Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
      areas.push(area);
    }

    return areas;
  }

  private calculateMeshComplexity(triangles: Triangle[], surfaceArea: number): number {
    // Complexity based on triangle density
    // More triangles per unit area = more complex
    const triangleDensity = triangles.length / surfaceArea;

    // Normalize to 0-100 scale
    // Typical range: 0.01 to 0.1 triangles/mm²
    const normalizedComplexity = Math.min(100, (triangleDensity / 0.1) * 100);

    return Math.round(normalizedComplexity);
  }

  private calculateDimensions(boundingBox: { x: number; y: number; z: number }): {
    width: number;
    height: number;
    depth: number;
  } {
    return {
      width: Math.round(boundingBox.x * 100) / 100,
      height: Math.round(boundingBox.y * 100) / 100,
      depth: Math.round(boundingBox.z * 100) / 100,
    };
  }
}
