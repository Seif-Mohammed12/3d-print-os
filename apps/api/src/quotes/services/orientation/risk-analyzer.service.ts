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
  supportPercentage: number;
  criticalOverhangs: number;
  supportDifficulty: 'low' | 'medium' | 'high' | 'extreme';
}

interface RiskAnalysis {
  riskPercentage: number;
  riskScore: number;
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
  stabilityScore: number;
  bedAdhesionScore: number;
  bridgeRisk: number;
  warpingRisk: number;
}

interface RiskAnalyzerConfig {
  maxStabilityRatio: number;
  minContactArea: number;
  bridgeLengthThreshold: number;
}

@Injectable()
export class RiskAnalyzerService {
  private readonly logger = new Logger(RiskAnalyzerService.name);
  private readonly defaultConfig: RiskAnalyzerConfig = {
    maxStabilityRatio: 5,
    minContactArea: 100,
    bridgeLengthThreshold: 20,
  };

  analyzeRisk(
    triangles: Triangle[],
    evaluation: OrientationEvaluation,
    supportEstimation: SupportEstimation,
    config: Partial<RiskAnalyzerConfig> = {},
  ): RiskAnalysis {
    const cfg = { ...this.defaultConfig, ...config };
    this.logger.log('Analyzing print failure risks');

    const riskFactors: Array<{
      factor: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
    }> = [];

    // 1. Stability analysis
    const stabilityScore = this.calculateStabilityScore(evaluation, cfg);
    if (stabilityScore < 50) {
      riskFactors.push({
        factor: 'Stability',
        severity: stabilityScore < 30 ? 'critical' : 'high',
        description: `Poor stability ratio (${stabilityScore.toFixed(0)}/100). Model may tip during printing.`,
      });
    }

    // 2. Bed adhesion analysis
    const bedAdhesionScore = this.calculateBedAdhesionScore(evaluation, cfg);
    if (bedAdhesionScore < 50) {
      riskFactors.push({
        factor: 'Bed Adhesion',
        severity: bedAdhesionScore < 30 ? 'critical' : 'high',
        description: `Insufficient bed contact (${evaluation.contactArea.toFixed(0)}mm²). May require brim or raft.`,
      });
    }

    // 3. Support dependency risk
    if (supportEstimation.supportPercentage > 30) {
      riskFactors.push({
        factor: 'Support Dependency',
        severity: supportEstimation.supportPercentage > 50 ? 'critical' : 'high',
        description: `High support material (${supportEstimation.supportPercentage.toFixed(0)}%). Increases failure risk.`,
      });
    }

    // 4. Bridge analysis
    const bridgeRisk = this.analyzeBridgeRisk(triangles, evaluation, cfg);
    if (bridgeRisk > 50) {
      riskFactors.push({
        factor: 'Bridge Risk',
        severity: bridgeRisk > 75 ? 'high' : 'medium',
        description: `Significant unsupported bridges detected (${bridgeRisk.toFixed(0)}% risk).`,
      });
    }

    // 5. Warping risk
    const warpingRisk = this.analyzeWarpingRisk(evaluation, triangles);
    if (warpingRisk > 50) {
      riskFactors.push({
        factor: 'Warping Risk',
        severity: warpingRisk > 75 ? 'high' : 'medium',
        description: `Large flat surfaces may cause warping (${warpingRisk.toFixed(0)}% risk).`,
      });
    }

    // 6. Height-based risk
    if (evaluation.height > 150) {
      riskFactors.push({
        factor: 'Print Height',
        severity: evaluation.height > 200 ? 'high' : 'medium',
        description: `Tall print (${evaluation.height.toFixed(0)}mm). Increased layer adhesion failure risk.`,
      });
    }

    // 7. Calculate overall risk percentage
    const riskPercentage = this.calculateOverallRisk(
      stabilityScore,
      bedAdhesionScore,
      supportEstimation.supportPercentage,
      bridgeRisk,
      warpingRisk,
    );

    const riskScore = 100 - riskPercentage;

    return {
      riskPercentage,
      riskScore,
      riskFactors,
      stabilityScore,
      bedAdhesionScore,
      bridgeRisk,
      warpingRisk,
    };
  }

  private calculateStabilityScore(
    evaluation: OrientationEvaluation,
    config: RiskAnalyzerConfig,
  ): number {
    const { height, footprintArea, centerOfGravity } = evaluation;

    if (footprintArea === 0) return 0;

    const footprintRadius = Math.sqrt(footprintArea / Math.PI);
    const stabilityRatio = height / footprintRadius;

    const ratioScore = Math.max(0, 100 - (stabilityRatio / config.maxStabilityRatio) * 100);

    const cgHeight = centerOfGravity.z - evaluation.boundingBox.min.z;
    const cgScore = Math.max(0, 100 - (cgHeight / height) * 50);

    return (ratioScore + cgScore) / 2;
  }

  private calculateBedAdhesionScore(
    evaluation: OrientationEvaluation,
    config: RiskAnalyzerConfig,
  ): number {
    const { contactArea, footprintArea } = evaluation;

    if (footprintArea === 0) return 0;

    const contactRatio = contactArea / footprintArea;
    const contactScore = Math.min(100, (contactRatio * 100) * 1.5);

    const absoluteScore = Math.min(100, (contactArea / config.minContactArea) * 100);

    return (contactScore + absoluteScore) / 2;
  }

  private analyzeBridgeRisk(
    triangles: Triangle[],
    evaluation: OrientationEvaluation,
    config: RiskAnalyzerConfig,
  ): number {
    let bridgeRisk = 0;
    let totalArea = 0;

    for (const tri of triangles) {
      if (!tri.normal || !tri.area) continue;

      totalArea += tri.area;

      const isHorizontal = Math.abs(tri.normal.z) > 0.9;
      const isAboveBed = tri.v1.z > evaluation.boundingBox.min.z + 5;

      if (isHorizontal && isAboveBed) {
        const edgeLength = Math.max(
          this.distance(tri.v1, tri.v2),
          this.distance(tri.v2, tri.v3),
          this.distance(tri.v3, tri.v1),
        );

        if (edgeLength > config.bridgeLengthThreshold) {
          bridgeRisk += tri.area;
        }
      }
    }

    return totalArea > 0 ? (bridgeRisk / totalArea) * 100 : 0;
  }

  private analyzeWarpingRisk(
    evaluation: OrientationEvaluation,
    triangles: Triangle[],
  ): number {
    const { footprintArea: _footprintArea, height: _height } = evaluation;

    const maxDimension = Math.max(
      evaluation.boundingBox.dimensions.x,
      evaluation.boundingBox.dimensions.y,
    );

    let largeFlatArea = 0;
    let totalArea = 0;

    for (const tri of triangles) {
      if (!tri.normal || !tri.area) continue;

      totalArea += tri.area;

      const isHorizontal = Math.abs(tri.normal.z) > 0.95;
      if (isHorizontal && tri.area > 50) {
        largeFlatArea += tri.area;
      }
    }

    const sizeRisk = Math.min(100, (maxDimension / 200) * 100);
    const flatRisk = totalArea > 0 ? (largeFlatArea / totalArea) * 100 : 0;

    return (sizeRisk + flatRisk) / 2;
  }

  private calculateOverallRisk(
    stabilityScore: number,
    bedAdhesionScore: number,
    supportPercentage: number,
    bridgeRisk: number,
    warpingRisk: number,
  ): number {
    const stabilityRisk = 100 - stabilityScore;
    const adhesionRisk = 100 - bedAdhesionScore;

    const weightedRisk =
      stabilityRisk * 0.3 +
      adhesionRisk * 0.25 +
      supportPercentage * 0.2 +
      bridgeRisk * 0.15 +
      warpingRisk * 0.1;

    return Math.min(100, Math.max(0, weightedRisk));
  }

  private distance(v1: Vertex, v2: Vertex): number {
    return Math.sqrt(
      Math.pow(v2.x - v1.x, 2) +
        Math.pow(v2.y - v1.y, 2) +
        Math.pow(v2.z - v1.z, 2),
    );
  }
}
