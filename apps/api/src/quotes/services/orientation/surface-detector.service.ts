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

interface PlanarPatch {
  triangles: number[];
  totalArea: number;
  averageNormal: { x: number; y: number; z: number };
  centroid: Vertex;
  boundary: Vertex[];
}

interface SurfaceDetectionResult {
  patches: PlanarPatch[];
  largestFlatSurface: {
    normal: { x: number; y: number; z: number };
    area: number;
    centroid: Vertex;
  } | null;
  totalSurfaceArea: number;
  planarSurfacePercentage: number;
}

interface SurfaceDetectorConfig {
  normalAngleThreshold: number; // degrees
  minPatchArea: number; // mm²
  minTrianglesPerPatch: number;
}

@Injectable()
export class SurfaceDetectorService {
  private readonly logger = new Logger(SurfaceDetectorService.name);
  private readonly defaultConfig: SurfaceDetectorConfig = {
    normalAngleThreshold: 10,
    minPatchArea: 10,
    minTrianglesPerPatch: 3,
  };

  detectSurfaces(
    triangles: Triangle[],
    config: Partial<SurfaceDetectorConfig> = {},
  ): SurfaceDetectionResult {
    const cfg = { ...this.defaultConfig, ...config };
    this.logger.log(`Detecting surfaces in ${triangles.length} triangles`);

    const patches = this.clusterPlanarSurfaces(triangles, cfg);
    const filteredPatches = patches.filter(
      (patch) =>
        patch.totalArea >= cfg.minPatchArea && patch.triangles.length >= cfg.minTrianglesPerPatch,
    );

    const totalSurfaceArea = triangles.reduce((sum, tri) => sum + (tri.area || 0), 0);
    const planarSurfaceArea = filteredPatches.reduce((sum, patch) => sum + patch.totalArea, 0);
    const planarSurfacePercentage =
      totalSurfaceArea > 0 ? (planarSurfaceArea / totalSurfaceArea) * 100 : 0;

    const largestFlatSurface = this.findLargestFlatSurface(filteredPatches);

    return {
      patches: filteredPatches,
      largestFlatSurface,
      totalSurfaceArea,
      planarSurfacePercentage,
    };
  }

  private clusterPlanarSurfaces(
    triangles: Triangle[],
    config: SurfaceDetectorConfig,
  ): PlanarPatch[] {
    const patches: PlanarPatch[] = [];
    const visited = new Set<number>();
    const angleThresholdRad = (config.normalAngleThreshold * Math.PI) / 180;

    for (let i = 0; i < triangles.length; i++) {
      const currentTriangle = triangles[i];
      if (visited.has(i) || !currentTriangle?.normal) continue;

      const seedNormal = currentTriangle.normal;
      const patchTriangles = [i];
      const queue = [i];
      visited.add(i);

      while (queue.length > 0) {
        const currentIdx = queue.shift()!;
        const currentTri = triangles[currentIdx];
        if (!currentTri) continue;

        for (let j = 0; j < triangles.length; j++) {
          const targetTriangle = triangles[j];
          if (visited.has(j) || !targetTriangle?.normal) continue;

          const angle = this.angleBetweenNormals(currentTri.normal!, targetTriangle.normal!);

          if (angle <= angleThresholdRad && this.areTrianglesAdjacent(currentTri, targetTriangle)) {
            visited.add(j);
            patchTriangles.push(j);
            queue.push(j);
          }
        }
      }

      if (patchTriangles.length > 0) {
        const patch = this.createPatch(triangles, patchTriangles);
        patches.push(patch);
      }
    }

    return patches;
  }

  private angleBetweenNormals(
    n1: { x: number; y: number; z: number },
    n2: { x: number; y: number; z: number },
  ): number {
    const dot = n1.x * n2.x + n1.y * n2.y + n1.z * n2.z;
    const mag1 = Math.sqrt(n1.x * n1.x + n1.y * n1.y + n1.z * n1.z);
    const mag2 = Math.sqrt(n2.x * n2.x + n2.y * n2.y + n2.z * n2.z);
    const cosAngle = dot / (mag1 * mag2);
    return Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  }

  private areTrianglesAdjacent(tri1: Triangle, tri2: Triangle): boolean {
    const vertices1 = [tri1.v1, tri1.v2, tri1.v3];
    const vertices2 = [tri2.v1, tri2.v2, tri2.v3];

    let sharedVertices = 0;
    for (const v1 of vertices1) {
      for (const v2 of vertices2) {
        if (this.verticesEqual(v1, v2)) {
          sharedVertices++;
          break;
        }
      }
    }

    return sharedVertices >= 2;
  }

  private verticesEqual(v1: Vertex, v2: Vertex): boolean {
    const epsilon = 0.001;
    return (
      Math.abs(v1.x - v2.x) < epsilon &&
      Math.abs(v1.y - v2.y) < epsilon &&
      Math.abs(v1.z - v2.z) < epsilon
    );
  }

  private createPatch(triangles: Triangle[], indices: number[]): PlanarPatch {
    let totalArea = 0;
    let cx = 0,
      cy = 0,
      cz = 0;
    let nx = 0,
      ny = 0,
      nz = 0;

    for (const idx of indices) {
      const tri = triangles[idx];
      if (!tri) continue;

      const area = tri.area || 0;
      totalArea += area;

      const centroid = {
        x: (tri.v1.x + tri.v2.x + tri.v3.x) / 3,
        y: (tri.v1.y + tri.v2.y + tri.v3.y) / 3,
        z: (tri.v1.z + tri.v2.z + tri.v3.z) / 3,
      };

      cx += centroid.x * area;
      cy += centroid.y * area;
      cz += centroid.z * area;

      if (tri.normal) {
        nx += tri.normal.x * area;
        ny += tri.normal.y * area;
        nz += tri.normal.z * area;
      }
    }

    const centroid = {
      x: totalArea > 0 ? cx / totalArea : 0,
      y: totalArea > 0 ? cy / totalArea : 0,
      z: totalArea > 0 ? cz / totalArea : 0,
    };

    const normalLength = Math.sqrt(nx * nx + ny * ny + nz * nz);
    const averageNormal =
      normalLength > 0
        ? { x: nx / normalLength, y: ny / normalLength, z: nz / normalLength }
        : { x: 0, y: 0, z: 1 };

    const boundary = this.calculateBoundary(triangles, indices);

    return {
      triangles: indices,
      totalArea,
      averageNormal,
      centroid,
      boundary,
    };
  }

  private calculateBoundary(triangles: Triangle[], indices: number[]): Vertex[] {
    const edgeSet = new Set<string>();
    const boundaryEdges: Array<[Vertex, Vertex]> = [];

    for (const idx of indices) {
      const tri = triangles[idx];
      if (!tri) continue;

      const edges = [
        [tri.v1, tri.v2],
        [tri.v2, tri.v3],
        [tri.v3, tri.v1],
      ] as [Vertex, Vertex][];

      for (const edge of edges) {
        const key = this.edgeKey(edge[0], edge[1]);
        if (edgeSet.has(key)) {
          edgeSet.delete(key);
        } else {
          edgeSet.add(key);
          boundaryEdges.push(edge);
        }
      }
    }

    const boundaryVertices = boundaryEdges.map((edge) => edge[0]);
    return boundaryVertices;
  }

  private edgeKey(v1: Vertex, v2: Vertex): string {
    const key1 = `${v1.x.toFixed(6)},${v1.y.toFixed(6)},${v1.z.toFixed(6)}`;
    const key2 = `${v2.x.toFixed(6)},${v2.y.toFixed(6)},${v2.z.toFixed(6)}`;
    return key1 < key2 ? `${key1}-${key2}` : `${key2}-${key1}`;
  }

  private findLargestFlatSurface(patches: PlanarPatch[]): {
    normal: { x: number; y: number; z: number };
    area: number;
    centroid: Vertex;
  } | null {
    if (patches.length === 0) return null;

    const largest = patches.reduce((max, patch) => (patch.totalArea > max.totalArea ? patch : max));

    return {
      normal: largest.averageNormal,
      area: largest.totalArea,
      centroid: largest.centroid,
    };
  }
}
