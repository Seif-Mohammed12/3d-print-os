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

interface Orientation {
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  normal: { x: number; y: number; z: number };
  source: string;
}

interface OrientationEvaluation {
  orientation: Orientation;
  boundingBox: {
    min: Vertex;
    max: Vertex;
    dimensions: Vertex;
  };
  height: number;
  contactArea: number;
  footprintArea: number;
  centerOfGravity: Vertex;
  buildDirection: { x: number; y: number; z: number };
}

interface OrientationEvaluatorConfig {
  bedSize: { x: number; y: number };
  layerHeight: number;
}

@Injectable()
export class OrientationEvaluatorService {
  private readonly logger = new Logger(OrientationEvaluatorService.name);
  private readonly defaultConfig: OrientationEvaluatorConfig = {
    bedSize: { x: 250, y: 250 },
    layerHeight: 0.2,
  };

  evaluateOrientation(
    triangles: Triangle[],
    orientation: Orientation,
    config: Partial<OrientationEvaluatorConfig> = {},
  ): OrientationEvaluation {
    const cfg = { ...this.defaultConfig, ...config };

    const rotatedTriangles = this.rotateTriangles(triangles, orientation);
    const boundingBox = this.calculateBoundingBox(rotatedTriangles);
    const height = boundingBox.dimensions.z;
    const footprintArea = boundingBox.dimensions.x * boundingBox.dimensions.y;
    const contactArea = this.calculateContactArea(rotatedTriangles, boundingBox);
    const centerOfGravity = this.calculateCenterOfGravity(rotatedTriangles);

    return {
      orientation,
      boundingBox,
      height,
      contactArea,
      footprintArea,
      centerOfGravity,
      buildDirection: { x: 0, y: 0, z: -1 },
    };
  }

  private rotateTriangles(
    triangles: Triangle[],
    orientation: Orientation,
  ): Triangle[] {
    const rotXRad = (orientation.rotationX * Math.PI) / 180;
    const rotYRad = (orientation.rotationY * Math.PI) / 180;
    const rotZRad = (orientation.rotationZ * Math.PI) / 180;

    return triangles.map((tri) => ({
      v1: this.rotateVertex(tri.v1, rotXRad, rotYRad, rotZRad),
      v2: this.rotateVertex(tri.v2, rotXRad, rotYRad, rotZRad),
      v3: this.rotateVertex(tri.v3, rotXRad, rotYRad, rotZRad),
      normal: tri.normal ? this.rotateVertex(tri.normal, rotXRad, rotYRad, rotZRad) : undefined,
      area: tri.area,
    }));
  }

  private rotateVertex(
    vertex: Vertex,
    rotX: number,
    rotY: number,
    rotZ: number,
  ): Vertex {
    // Apply rotation around X axis
    let x = vertex.x;
    let y = vertex.y * Math.cos(rotX) - vertex.z * Math.sin(rotX);
    let z = vertex.y * Math.sin(rotX) + vertex.z * Math.cos(rotX);

    // Apply rotation around Y axis
    const tempX = x * Math.cos(rotY) + z * Math.sin(rotY);
    z = -x * Math.sin(rotY) + z * Math.cos(rotY);
    x = tempX;

    // Apply rotation around Z axis
    const tempX2 = x * Math.cos(rotZ) - y * Math.sin(rotZ);
    y = x * Math.sin(rotZ) + y * Math.cos(rotZ);
    x = tempX2;

    return { x, y, z };
  }

  private calculateBoundingBox(triangles: Triangle[]): {
    min: Vertex;
    max: Vertex;
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

    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      dimensions: {
        x: maxX - minX,
        y: maxY - minY,
        z: maxZ - minZ,
      },
    };
  }

  private calculateContactArea(
    triangles: Triangle[],
    boundingBox: { min: Vertex; max: Vertex },
  ): number {
    const bedZ = boundingBox.min.z;
    let contactArea = 0;

    for (const tri of triangles) {
      if (this.isTriangleOnBed(tri, bedZ)) {
        contactArea += tri.area || 0;
      }
    }

    return contactArea;
  }

  private isTriangleOnBed(triangle: Triangle, bedZ: number): boolean {
    const epsilon = 0.1;
    const vertices = [triangle.v1, triangle.v2, triangle.v3];

    for (const v of vertices) {
      if (Math.abs(v.z - bedZ) > epsilon) {
        return false;
      }
    }

    return true;
  }

  private calculateCenterOfGravity(triangles: Triangle[]): Vertex {
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
}
