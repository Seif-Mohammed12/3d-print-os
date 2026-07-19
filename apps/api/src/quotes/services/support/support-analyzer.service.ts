import { Injectable, Logger } from '@nestjs/common';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Triangle {
  v1: Vector3;
  v2: Vector3;
  v3: Vector3;
}

export interface SupportConfig {
  supportAngleThreshold: number; // degrees, default 45
  bridgeLengthThreshold: number; // mm, default 10
  supportDensityFactor: number; // 0.1-0.3, default 0.2
  layerHeight: number; // mm, default 0.2
  enableRaycasting: boolean; // default false for performance
}

export interface OverhangTriangle {
  triangleIndex: number;
  area: number;
  centroid: Vector3;
  normal: Vector3;
  overhangAngle: number;
  unsupportedHeight: number;
  bridgeLength: number;
  needsSupport: boolean;
}

export interface SupportRegion {
  triangles: number[];
  totalArea: number;
  averageOverhangAngle: number;
  averageUnsupportedHeight: number;
  centroid: Vector3;
  boundingBox: { min: Vector3; max: Vector3 };
}

export interface SupportAnalysisResult {
  supportRequired: boolean;
  supportPercentage: number;
  supportAreaMm2: number;
  supportVolumeCm3: number;
  supportWeightGrams: number;
  supportTimeMinutes: number;
  supportCost: number;
  supportRegions: SupportRegion[];
  difficulty: 'very_low' | 'low' | 'medium' | 'high' | 'extreme';
  confidenceScore: number;
}

@Injectable()
export class GeometricSupportAnalyzerService {
  private readonly logger = new Logger(GeometricSupportAnalyzerService.name);
  private readonly defaultConfig: SupportConfig = {
    supportAngleThreshold: 45,
    bridgeLengthThreshold: 10,
    supportDensityFactor: 0.2,
    layerHeight: 0.2,
    enableRaycasting: false,
  };

  constructor() {
    this.logger.log('SupportAnalyzerService initialized');
  }

  analyzeSupport(
    triangles: Triangle[],
    config: Partial<SupportConfig> = {},
  ): SupportAnalysisResult {
    const mergedConfig = { ...this.defaultConfig, ...config };
    this.logger.log(
      `Analyzing support for ${triangles.length} triangles with config: ${JSON.stringify(mergedConfig)}`,
    );

    // Step 1: Calculate face normals and properties
    const triangleData = this.calculateTriangleProperties(triangles);

    // Step 2: Detect overhang candidates
    const overhangCandidates = this.detectOverhangs(
      triangleData,
      mergedConfig.supportAngleThreshold,
    );

    // Step 3: Validate support requirements (simplified for now)
    const validatedOverhangs = this.validateSupportRequirements(
      overhangCandidates,
      triangleData,
      mergedConfig,
    );

    // Step 4: Cluster support regions
    const supportRegions = this.clusterSupportRegions(validatedOverhangs, triangleData);

    // Step 5: Calculate support metrics
    const supportArea = this.calculateSupportArea(validatedOverhangs);
    const supportVolume = this.estimateSupportVolume(
      validatedOverhangs,
      supportArea,
      mergedConfig.supportDensityFactor,
    );
    const supportWeight = this.estimateSupportWeight(supportVolume);
    const supportTime = this.estimateSupportTime(supportVolume, mergedConfig.layerHeight);
    const supportCost = this.estimateSupportCost(supportVolume, supportTime);

    // Step 6: Determine difficulty
    const difficulty = this.determineSupportDifficulty(
      validatedOverhangs,
      supportRegions,
      supportVolume,
    );

    // Step 7: Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(
      validatedOverhangs,
      mergedConfig.enableRaycasting,
    );

    const totalArea = triangleData.reduce((sum, t) => sum + t.area, 0);
    const supportPercentage = totalArea > 0 ? (supportArea / totalArea) * 100 : 0;

    return {
      supportRequired: validatedOverhangs.length > 0,
      supportPercentage,
      supportAreaMm2: supportArea,
      supportVolumeCm3: supportVolume,
      supportWeightGrams: supportWeight,
      supportTimeMinutes: supportTime,
      supportCost,
      supportRegions,
      difficulty,
      confidenceScore,
    };
  }

  private calculateTriangleProperties(triangles: Triangle[]) {
    return triangles.map((tri, index) => {
      const v1 = tri.v1;
      const v2 = tri.v2;
      const v3 = tri.v3;

      // Calculate normal
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
      const normal = {
        x: edge1.y * edge2.z - edge1.z * edge2.y,
        y: edge1.z * edge2.x - edge1.x * edge2.z,
        z: edge1.x * edge2.y - edge1.y * edge2.x,
      };

      const normalLength = Math.sqrt(
        normal.x * normal.x + normal.y * normal.y + normal.z * normal.z,
      );
      if (normalLength > 0) {
        normal.x /= normalLength;
        normal.y /= normalLength;
        normal.z /= normalLength;
      }

      // Calculate area
      const area = normalLength / 2;

      // Calculate centroid
      const centroid = {
        x: (v1.x + v2.x + v3.x) / 3,
        y: (v1.y + v2.y + v3.y) / 3,
        z: (v1.z + v2.z + v3.z) / 3,
      };

      return { index, normal, area, centroid };
    });
  }

  private detectOverhangs(
    triangleData: Array<{
      index: number;
      normal: Vector3;
      area: number;
      centroid: Vector3;
    }>,
    thresholdDegrees: number,
  ): OverhangTriangle[] {
    const buildDirection = { x: 0, y: 0, z: -1 }; // Downward in Three.js

    return triangleData
      .map((td) => {
        const dotProduct =
          td.normal.x * buildDirection.x +
          td.normal.y * buildDirection.y +
          td.normal.z * buildDirection.z;
        const overhangAngle = Math.acos(Math.max(-1, Math.min(1, dotProduct))) * (180 / Math.PI);

        return {
          triangleIndex: td.index,
          area: td.area,
          centroid: td.centroid,
          normal: td.normal,
          overhangAngle,
          unsupportedHeight: 0,
          bridgeLength: 0,
          needsSupport: overhangAngle > thresholdDegrees,
        };
      })
      .filter((oh) => oh.needsSupport);
  }

  private validateSupportRequirements(
    overhangs: OverhangTriangle[],
    _triangleData: Array<{
      index: number;
      normal: Vector3;
      area: number;
      centroid: Vector3;
    }>,
    config: SupportConfig,
  ): OverhangTriangle[] {
    // Simplified validation - in full implementation would use raycasting
    // For now, we estimate unsupported height based on overhang angle
    return overhangs.map((oh) => {
      const unsupportedHeight = Math.tan((oh.overhangAngle * Math.PI) / 180) * 5; // Simplified
      const bridgeLength = unsupportedHeight > config.bridgeLengthThreshold ? unsupportedHeight : 0;

      return {
        ...oh,
        unsupportedHeight,
        bridgeLength,
        needsSupport: bridgeLength > config.bridgeLengthThreshold,
      };
    });
  }

  private clusterSupportRegions(
    overhangs: OverhangTriangle[],
    _triangleData: Array<{
      index: number;
      normal: Vector3;
      area: number;
      centroid: Vector3;
    }>,
  ): SupportRegion[] {
    if (overhangs.length === 0) return [];

    // Simplified clustering - group by proximity
    const regions: SupportRegion[] = [];
    const visited = new Set<number>();

    for (const overhang of overhangs) {
      if (visited.has(overhang.triangleIndex)) continue;

      const regionTriangles: number[] = [overhang.triangleIndex];
      visited.add(overhang.triangleIndex);

      // Find nearby triangles (simplified - would use proper adjacency in full implementation)
      for (const other of overhangs) {
        if (visited.has(other.triangleIndex)) continue;

        const distance = Math.sqrt(
          Math.pow(overhang.centroid.x - other.centroid.x, 2) +
            Math.pow(overhang.centroid.y - other.centroid.y, 2) +
            Math.pow(overhang.centroid.z - other.centroid.z, 2),
        );

        if (distance < 10) {
          // 10mm clustering threshold
          regionTriangles.push(other.triangleIndex);
          visited.add(other.triangleIndex);
        }
      }

      const regionData = regionTriangles.map((idx) =>
        overhangs.find((o) => o.triangleIndex === idx)!,
      );
      const totalArea = regionData.reduce((sum, r) => sum + r.area, 0);
      const avgAngle = regionData.reduce((sum, r) => sum + r.overhangAngle, 0) / regionData.length;
      const avgHeight =
        regionData.reduce((sum, r) => sum + r.unsupportedHeight, 0) / regionData.length;

      const centroid = {
        x: regionData.reduce((sum, r) => sum + r.centroid.x, 0) / regionData.length,
        y: regionData.reduce((sum, r) => sum + r.centroid.y, 0) / regionData.length,
        z: regionData.reduce((sum, r) => sum + r.centroid.z, 0) / regionData.length,
      };

      const boundingBox = {
        min: {
          x: Math.min(...regionData.map((r) => r.centroid.x)),
          y: Math.min(...regionData.map((r) => r.centroid.y)),
          z: Math.min(...regionData.map((r) => r.centroid.z)),
        },
        max: {
          x: Math.max(...regionData.map((r) => r.centroid.x)),
          y: Math.max(...regionData.map((r) => r.centroid.y)),
          z: Math.max(...regionData.map((r) => r.centroid.z)),
        },
      };

      regions.push({
        triangles: regionTriangles,
        totalArea,
        averageOverhangAngle: avgAngle,
        averageUnsupportedHeight: avgHeight,
        centroid,
        boundingBox,
      });
    }

    return regions;
  }

  private calculateSupportArea(overhangs: OverhangTriangle[]): number {
    return overhangs.reduce((sum, oh) => sum + oh.area, 0);
  }

  private estimateSupportVolume(
    overhangs: OverhangTriangle[],
    supportArea: number,
    densityFactor: number,
  ): number {
    const avgHeight =
      overhangs.length > 0
        ? overhangs.reduce((sum, oh) => sum + oh.unsupportedHeight, 0) / overhangs.length
        : 0;
    const volumeMm3 = supportArea * avgHeight * densityFactor;
    return volumeMm3 / 1000; // Convert to cm³
  }

  private estimateSupportWeight(volumeCm3: number): number {
    // PLA density ~1.24 g/cm³
    return volumeCm3 * 1.24;
  }

  private estimateSupportTime(volumeCm3: number, layerHeight: number): number {
    // Simplified time estimation based on volume and layer height
    const volumeMm3 = volumeCm3 * 1000;
    const layers = volumeMm3 / (layerHeight * 100); // Approximate
    return layers * 0.5; // 0.5 minutes per layer for supports
  }

  private estimateSupportCost(volumeCm3: number, timeMinutes: number): number {
    // Material cost: $20/kg for PLA
    const materialCost = ((volumeCm3 * 1.24) / 1000) * 20;
    // Time cost: $0.10 per minute
    const timeCost = timeMinutes * 0.1;
    return materialCost + timeCost;
  }

  private determineSupportDifficulty(
    overhangs: OverhangTriangle[],
    regions: SupportRegion[],
    volumeCm3: number,
  ): 'very_low' | 'low' | 'medium' | 'high' | 'extreme' {
    if (overhangs.length === 0) return 'very_low';

    const avgAngle = overhangs.reduce((sum, oh) => sum + oh.overhangAngle, 0) / overhangs.length;
    const regionCount = regions.length;

    if (avgAngle < 50 && regionCount <= 2 && volumeCm3 < 5) return 'low';
    if (avgAngle < 60 && regionCount <= 5 && volumeCm3 < 20) return 'medium';
    if (avgAngle < 75 && regionCount <= 10 && volumeCm3 < 50) return 'high';
    return 'extreme';
  }

  private calculateConfidenceScore(
    overhangs: OverhangTriangle[],
    raycastingEnabled: boolean,
  ): number {
    if (overhangs.length === 0) return 1.0;

    let confidence = 0.7; // Base confidence for geometric estimation
    if (raycastingEnabled) confidence += 0.2; // Higher confidence with raycasting validation
    if (overhangs.length > 100) confidence += 0.05; // More data points = higher confidence

    return Math.min(1.0, confidence);
  }
}
