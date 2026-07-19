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

interface OrientationEvaluation {
  boundingBox: {
    min: Vertex;
    max: Vertex;
    dimensions: Vertex;
  };
  height: number;
  contactArea: number;
  footprintArea: number;
  centerOfGravity: Vertex;
}

interface SupportEstimation {
  overhangArea: number;
  overhangPercentage: number;
  supportVolume: number;
  supportVolumeCm3: number;
  supportPercentage: number;
  supportDifficulty: 'low' | 'medium' | 'high' | 'extreme';
  overhangFaces: number;
  criticalOverhangs: number;
}

interface SupportEstimatorConfig {
  supportAngleThreshold: number; // degrees
  layerHeight: number;
  nozzleDiameter: number;
}

@Injectable()
export class SupportEstimatorService {
  private readonly logger = new Logger(SupportEstimatorService.name);
  private readonly defaultConfig: SupportEstimatorConfig = {
    supportAngleThreshold: 45,
    layerHeight: 0.2,
    nozzleDiameter: 0.4,
  };

  estimateSupport(
    triangles: Triangle[],
    evaluation: OrientationEvaluation,
    config: Partial<SupportEstimatorConfig> = {},
  ): SupportEstimation {
    const cfg = { ...this.defaultConfig, ...config };
    this.logger.log('Estimating support requirements');

    const angleThresholdRad = (cfg.supportAngleThreshold * Math.PI) / 180;
    const buildDirection = { x: 0, y: 0, z: -1 };

    let overhangArea = 0;
    let totalArea = 0;
    let overhangFaces = 0;
    let criticalOverhangs = 0;

    for (const tri of triangles) {
      if (!tri.normal || !tri.area) continue;

      totalArea += tri.area;

      const angle = this.angleBetweenNormals(tri.normal, buildDirection);

      if (angle > angleThresholdRad) {
        overhangArea += tri.area;
        overhangFaces++;

        if (angle > (70 * Math.PI) / 180) {
          criticalOverhangs++;
        }
      }
    }

    const overhangPercentage = totalArea > 0 ? (overhangArea / totalArea) * 100 : 0;

    const supportVolume = this.calculateSupportVolume(
      overhangArea,
      evaluation.height,
      cfg.layerHeight,
      cfg.nozzleDiameter,
    );

    const supportVolumeCm3 = supportVolume / 1000;
    const modelVolume = this.calculateModelVolume(triangles);
    const supportPercentage = modelVolume > 0 ? (supportVolume / modelVolume) * 100 : 0;

    const supportDifficulty = this.determineSupportDifficulty(
      overhangPercentage,
      criticalOverhangs,
      evaluation.height,
    );

    return {
      overhangArea,
      overhangPercentage,
      supportVolume,
      supportVolumeCm3,
      supportPercentage,
      supportDifficulty,
      overhangFaces,
      criticalOverhangs,
    };
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

  private calculateSupportVolume(
    overhangArea: number,
    height: number,
    layerHeight: number,
    nozzleDiameter: number,
  ): number {
    if (overhangArea === 0 || height === 0) return 0;

    const layerCount = Math.ceil(height / layerHeight);
    const supportAreaPerLayer = overhangArea * 1.2; // 20% margin
    const supportVolumePerLayer = supportAreaPerLayer * layerHeight;
    const totalSupportVolume = supportVolumePerLayer * layerCount;

    return totalSupportVolume;
  }

  private calculateModelVolume(triangles: Triangle[]): number {
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

  private determineSupportDifficulty(
    overhangPercentage: number,
    criticalOverhangs: number,
    height: number,
  ): 'low' | 'medium' | 'high' | 'extreme' {
    if (overhangPercentage < 5 && criticalOverhangs === 0) {
      return 'low';
    } else if (overhangPercentage < 15 && criticalOverhangs < 5) {
      return 'medium';
    } else if (overhangPercentage < 30 && criticalOverhangs < 10) {
      return 'high';
    } else {
      return 'extreme';
    }
  }
}
