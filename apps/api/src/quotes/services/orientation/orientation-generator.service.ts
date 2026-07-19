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
  totalArea: number;
  averageNormal: { x: number; y: number; z: number };
  centroid: Vertex;
}

interface Orientation {
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  normal: { x: number; y: number; z: number };
  source: 'surface' | 'principal_axis' | 'bounding_box' | 'default';
}

interface OrientationGeneratorConfig {
  maxOrientations: number;
  minSurfaceArea: number;
  includePrincipalAxes: boolean;
  includeBoundingBoxOrientations: boolean;
}

@Injectable()
export class OrientationGeneratorService {
  private readonly logger = new Logger(OrientationGeneratorService.name);
  private readonly defaultConfig: OrientationGeneratorConfig = {
    maxOrientations: 50,
    minSurfaceArea: 50,
    includePrincipalAxes: true,
    includeBoundingBoxOrientations: true,
  };

  generateOrientations(
    triangles: Triangle[],
    planarPatches: PlanarPatch[],
    principalAxes: { axis1: Vertex; axis2: Vertex; axis3: Vertex },
    config: Partial<OrientationGeneratorConfig> = {},
  ): Orientation[] {
    const cfg = { ...this.defaultConfig, ...config };
    this.logger.log('Generating candidate orientations');

    const orientations: Orientation[] = [];

    // 1. Generate orientations from large planar surfaces
    const surfaceOrientations = this.generateFromSurfaces(planarPatches, cfg);
    orientations.push(...surfaceOrientations);

    // 2. Generate from principal axes
    if (cfg.includePrincipalAxes) {
      const axisOrientations = this.generateFromPrincipalAxes(principalAxes);
      orientations.push(...axisOrientations);
    }

    // 3. Generate from bounding box directions
    if (cfg.includeBoundingBoxOrientations) {
      const boxOrientations = this.generateFromBoundingBox(triangles);
      orientations.push(...boxOrientations);
    }

    // 4. Add default orientations (flat on bed)
    const defaultOrientations = this.generateDefaultOrientations();
    orientations.push(...defaultOrientations);

    // 5. Remove duplicates
    const uniqueOrientations = this.removeDuplicateOrientations(orientations);

    // 6. Limit to max orientations
    const limitedOrientations = uniqueOrientations.slice(0, cfg.maxOrientations);

    this.logger.log(`Generated ${limitedOrientations.length} unique orientations`);
    return limitedOrientations;
  }

  private generateFromSurfaces(
    patches: PlanarPatch[],
    config: OrientationGeneratorConfig,
  ): Orientation[] {
    const orientations: Orientation[] = [];

    for (const patch of patches) {
      if (patch.totalArea < config.minSurfaceArea) continue;

      const normal = patch.averageNormal;

      // Calculate rotation to align this normal with -Z (build direction)
      const rotation = this.calculateRotationFromNormal(normal);

      orientations.push({
        rotationX: rotation.x,
        rotationY: rotation.y,
        rotationZ: rotation.z,
        normal,
        source: 'surface',
      });
    }

    return orientations;
  }

  private generateFromPrincipalAxes(principalAxes: {
    axis1: Vertex;
    axis2: Vertex;
    axis3: Vertex;
  }): Orientation[] {
    const orientations: Orientation[] = [];

    // Generate orientations aligning each principal axis with -Z
    const axes = [principalAxes.axis1, principalAxes.axis2, principalAxes.axis3];

    for (const axis of axes) {
      const rotation = this.calculateRotationFromNormal(axis);

      orientations.push({
        rotationX: rotation.x,
        rotationY: rotation.y,
        rotationZ: rotation.z,
        normal: axis,
        source: 'principal_axis',
      });
    }

    // Also generate orientations with 90-degree rotations around each axis
    for (const axis of axes) {
      for (const angle of [90, 180, 270]) {
        const rotatedNormal = this.rotateVector(axis, angle);
        const rotation = this.calculateRotationFromNormal(rotatedNormal);

        orientations.push({
          rotationX: rotation.x,
          rotationY: rotation.y,
          rotationZ: rotation.z,
          normal: rotatedNormal,
          source: 'principal_axis',
        });
      }
    }

    return orientations;
  }

  private generateFromBoundingBox(triangles: Triangle[]): Orientation[] {
    const orientations: Orientation[] = [];

    // Calculate bounding box
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

    // Generate orientations for each face of the bounding box
    const faces = [
      { normal: { x: 0, y: 0, z: -1 }, name: 'bottom' },
      { normal: { x: 0, y: 0, z: 1 }, name: 'top' },
      { normal: { x: -1, y: 0, z: 0 }, name: 'left' },
      { normal: { x: 1, y: 0, z: 0 }, name: 'right' },
      { normal: { x: 0, y: -1, z: 0 }, name: 'front' },
      { normal: { x: 0, y: 1, z: 0 }, name: 'back' },
    ];

    for (const face of faces) {
      const rotation = this.calculateRotationFromNormal(face.normal);

      orientations.push({
        rotationX: rotation.x,
        rotationY: rotation.y,
        rotationZ: rotation.z,
        normal: face.normal,
        source: 'bounding_box',
      });
    }

    return orientations;
  }

  private generateDefaultOrientations(): Orientation[] {
    return [
      {
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        normal: { x: 0, y: 0, z: -1 },
        source: 'default',
      },
      {
        rotationX: 90,
        rotationY: 0,
        rotationZ: 0,
        normal: { x: 0, y: -1, z: 0 },
        source: 'default',
      },
      {
        rotationX: 0,
        rotationY: 90,
        rotationZ: 0,
        normal: { x: 1, y: 0, z: 0 },
        source: 'default',
      },
    ];
  }

  private calculateRotationFromNormal(
    normal: { x: number; y: number; z: number },
  ): { x: number; y: number; z: number } {
    // Calculate Euler angles to rotate the given normal to point in -Z direction
    const targetNormal = { x: 0, y: 0, z: -1 };

    // Normalize input
    const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    const n = length > 0 ? { x: normal.x / length, y: normal.y / length, z: normal.z / length } : { x: 0, y: 0, z: -1 };

    // Calculate rotation around Y axis
    const rotY = Math.atan2(n.x, n.z) * (180 / Math.PI);

    // Calculate rotation around X axis
    const rotX = Math.atan2(n.y, Math.sqrt(n.x * n.x + n.z * n.z)) * (180 / Math.PI);

    // Z rotation can be arbitrary for this purpose
    const rotZ = 0;

    return {
      x: rotX,
      y: rotY,
      z: rotZ,
    };
  }

  private rotateVector(
    vector: { x: number; y: number; z: number },
    angleDegrees: number,
  ): { x: number; y: number; z: number } {
    const angleRad = (angleDegrees * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    // Rotate around Z axis (simplified)
    return {
      x: vector.x * cos - vector.y * sin,
      y: vector.x * sin + vector.y * cos,
      z: vector.z,
    };
  }

  private removeDuplicateOrientations(orientations: Orientation[]): Orientation[] {
    const unique: Orientation[] = [];
    const seen = new Set<string>();

    for (const orientation of orientations) {
      const key = this.orientationKey(orientation);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(orientation);
      }
    }

    return unique;
  }

  private orientationKey(orientation: Orientation): string {
    // Normalize rotations to handle equivalent angles
    const normX = Math.round(orientation.rotationX) % 360;
    const normY = Math.round(orientation.rotationY) % 360;
    const normZ = Math.round(orientation.rotationZ) % 360;

    return `${normX},${normY},${normZ}`;
  }
}
