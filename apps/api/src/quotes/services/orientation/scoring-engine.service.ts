import { Injectable, Logger } from '@nestjs/common';

interface Vertex {
  x: number;
  y: number;
  z: number;
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
}

interface SupportEstimation {
  supportPercentage: number;
  supportDifficulty: 'low' | 'medium' | 'high' | 'extreme';
}

interface RiskAnalysis {
  riskPercentage: number;
  stabilityScore: number;
  bedAdhesionScore: number;
  bridgeRisk: number;
  warpingRisk: number;
}

interface OrientationScore {
  orientation: Orientation;
  totalScore: number;
  breakdown: {
    supportScore: number;
    bedContactScore: number;
    heightScore: number;
    stabilityScore: number;
    surfaceQualityScore: number;
    riskScore: number;
  };
  explanation: string;
}

interface ScoringWeights {
  support: number;
  bedContact: number;
  height: number;
  stability: number;
  surfaceQuality: number;
  risk: number;
}

interface ScoringEngineConfig {
  weights: ScoringWeights;
  maxHeight: number;
  idealContactRatio: number;
}

@Injectable()
export class ScoringEngineService {
  private readonly logger = new Logger(ScoringEngineService.name);
  private readonly defaultConfig: ScoringEngineConfig = {
    weights: {
      support: 0.35,
      bedContact: 0.2,
      height: 0.15,
      stability: 0.15,
      surfaceQuality: 0.1,
      risk: 0.05,
    },
    maxHeight: 200,
    idealContactRatio: 0.8,
  };

  scoreOrientation(
    evaluation: OrientationEvaluation,
    supportEstimation: SupportEstimation,
    riskAnalysis: RiskAnalysis,
    config: Partial<ScoringEngineConfig> = {},
  ): OrientationScore {
    const cfg = { ...this.defaultConfig, ...config };
    this.logger.log('Scoring orientation');

    const supportScore = this.calculateSupportScore(supportEstimation);
    const bedContactScore = this.calculateBedContactScore(evaluation, cfg);
    const heightScore = this.calculateHeightScore(evaluation, cfg);
    const stabilityScore = this.calculateStabilityScore(riskAnalysis.stabilityScore);
    const surfaceQualityScore = this.calculateSurfaceQualityScore(evaluation);
    const riskScore = this.calculateRiskScore(riskAnalysis);

    const totalScore =
      supportScore * cfg.weights.support +
      bedContactScore * cfg.weights.bedContact +
      heightScore * cfg.weights.height +
      stabilityScore * cfg.weights.stability +
      surfaceQualityScore * cfg.weights.surfaceQuality +
      riskScore * cfg.weights.risk;

    const explanation = this.generateExplanation(
      supportScore,
      bedContactScore,
      heightScore,
      stabilityScore,
      surfaceQualityScore,
      riskScore,
      supportEstimation,
      evaluation,
    );

    return {
      orientation: evaluation.orientation,
      totalScore,
      breakdown: {
        supportScore,
        bedContactScore,
        heightScore,
        stabilityScore,
        surfaceQualityScore,
        riskScore,
      },
      explanation,
    };
  }

  private calculateSupportScore(supportEstimation: SupportEstimation): number {
    const { supportPercentage, supportDifficulty } = supportEstimation;

    let score = 100 - supportPercentage;

    const difficultyPenalty = {
      low: 0,
      medium: 10,
      high: 20,
      extreme: 30,
    };

    score -= difficultyPenalty[supportDifficulty];

    return Math.max(0, Math.min(100, score));
  }

  private calculateBedContactScore(
    evaluation: OrientationEvaluation,
    config: ScoringEngineConfig,
  ): number {
    const { contactArea, footprintArea } = evaluation;

    if (footprintArea === 0) return 0;

    const contactRatio = contactArea / footprintArea;
    const ratioScore = Math.min(100, (contactRatio / config.idealContactRatio) * 100);

    const absoluteScore = Math.min(100, (contactArea / 500) * 100);

    return (ratioScore + absoluteScore) / 2;
  }

  private calculateHeightScore(
    evaluation: OrientationEvaluation,
    config: ScoringEngineConfig,
  ): number {
    const { height } = evaluation;

    const heightRatio = height / config.maxHeight;
    const score = 100 - heightRatio * 100;

    return Math.max(0, Math.min(100, score));
  }

  private calculateStabilityScore(stabilityScore: number): number {
    return stabilityScore;
  }

  private calculateSurfaceQualityScore(evaluation: OrientationEvaluation): number {
    const { height, footprintArea } = evaluation;

    if (footprintArea === 0) return 50;

    const aspectRatio = height / Math.sqrt(footprintArea);
    const score = Math.max(0, 100 - aspectRatio * 20);

    return Math.min(100, score);
  }

  private calculateRiskScore(riskAnalysis: RiskAnalysis): number {
    return 100 - riskAnalysis.riskPercentage;
  }

  private generateExplanation(
    supportScore: number,
    bedContactScore: number,
    heightScore: number,
    stabilityScore: number,
    surfaceQualityScore: number,
    riskScore: number,
    _supportEstimation: SupportEstimation,
    _evaluation: OrientationEvaluation,
  ): string {
    const reasons: string[] = [];

    if (supportScore > 70) {
      reasons.push(`${(100 - supportScore).toFixed(0)}% lower support material`);
    }
    if (heightScore > 70) {
      reasons.push(`${(100 - heightScore).toFixed(0)}% shorter print height`);
    }
    if (bedContactScore > 70) {
      reasons.push('Larger bed contact area');
    }
    if (stabilityScore > 70) {
      reasons.push('Improved stability');
    }
    if (riskScore > 70) {
      reasons.push('Lower failure probability');
    }

    if (reasons.length === 0) {
      return 'Selected for balanced print characteristics.';
    }

    return `Selected this orientation because:\n• ${reasons.join('\n• ')}`;
  }
}
