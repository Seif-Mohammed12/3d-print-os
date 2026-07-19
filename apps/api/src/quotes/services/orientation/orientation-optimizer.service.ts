import { Injectable, Logger } from '@nestjs/common';
import { MeshAnalyzerService } from './mesh-analyzer.service';
import { SurfaceDetectorService } from './surface-detector.service';
import { OrientationGeneratorService } from './orientation-generator.service';
import { OrientationEvaluatorService } from './orientation-evaluator.service';
import { SupportEstimatorService } from './support-estimator.service';
import { RiskAnalyzerService } from './risk-analyzer.service';
import { ScoringEngineService } from './scoring-engine.service';

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

interface OrientationResult {
  recommendedOrientation: {
    rotationX: number;
    rotationY: number;
    rotationZ: number;
  };
  score: number;
  explanation: string;
  alternativeOrientations: Array<{
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    score: number;
    explanation: string;
  }>;
  analysis: {
    supportVolumeCm3: number;
    supportPercentage: number;
    supportDifficulty: 'low' | 'medium' | 'high' | 'extreme';
    estimatedHeight: number;
    contactArea: number;
    riskPercentage: number;
    riskFactors: Array<{ factor: string; severity: string; description: string }>;
  };
}

interface OrientationOptimizerConfig {
  maxOrientations: number;
  scoringWeights: {
    support: number;
    bedContact: number;
    height: number;
    stability: number;
    surfaceQuality: number;
    risk: number;
  };
}

@Injectable()
export class OrientationOptimizerService {
  private readonly logger = new Logger(OrientationOptimizerService.name);
  private readonly defaultConfig: OrientationOptimizerConfig = {
    maxOrientations: 50,
    scoringWeights: {
      support: 0.35,
      bedContact: 0.2,
      height: 0.15,
      stability: 0.15,
      surfaceQuality: 0.1,
      risk: 0.05,
    },
  };

  constructor(
    private readonly meshAnalyzer: MeshAnalyzerService,
    private readonly surfaceDetector: SurfaceDetectorService,
    private readonly orientationGenerator: OrientationGeneratorService,
    private readonly orientationEvaluator: OrientationEvaluatorService,
    private readonly supportEstimator: SupportEstimatorService,
    private readonly riskAnalyzer: RiskAnalyzerService,
    private readonly scoringEngine: ScoringEngineService,
  ) {}

  async optimizeOrientation(
    triangles: Triangle[],
    config: Partial<OrientationOptimizerConfig> = {},
  ): Promise<OrientationResult> {
    const cfg = { ...this.defaultConfig, ...config };
    this.logger.log(`Starting orientation optimization for ${triangles.length} triangles`);

    try {
      // Step 1: Analyze mesh
      this.logger.log('Step 1: Analyzing mesh');
      const meshAnalysis = this.meshAnalyzer.analyzeMesh(triangles);
      this.logger.log('Mesh analysis completed');

      // Step 2: Detect surfaces
      this.logger.log('Step 2: Detecting surfaces');
      const surfaceDetection = this.surfaceDetector.detectSurfaces(triangles);
      this.logger.log('Surface detection completed');

      // Step 3: Generate candidate orientations
      this.logger.log('Step 3: Generating candidate orientations');
      const orientations = this.orientationGenerator.generateOrientations(
        triangles,
        surfaceDetection.patches,
        meshAnalysis.principalAxes,
        { maxOrientations: cfg.maxOrientations },
      );
      this.logger.log(`Generated ${orientations.length} candidate orientations`);

      this.logger.log(`Evaluating ${orientations.length} candidate orientations`);

      // Step 4: Evaluate each orientation
      const scoredOrientations = await this.evaluateOrientations(triangles, orientations, cfg);
      this.logger.log(`Evaluated ${scoredOrientations.length} orientations`);

      // Step 5: Sort by score
      scoredOrientations.sort((a, b) => b.totalScore - a.totalScore);

      // Step 6: Select best orientation
      const bestOrientation = scoredOrientations[0];

      if (!bestOrientation) {
        this.logger.error('No valid orientations found after evaluation');
        throw new Error('No valid orientations found');
      }

      this.logger.log(`Best orientation score: ${bestOrientation.totalScore.toFixed(1)}`);

      // Step 7: Get detailed analysis for best orientation
      this.logger.log('Step 7: Getting detailed analysis for best orientation');
      const bestEvaluation = this.orientationEvaluator.evaluateOrientation(
        triangles,
        bestOrientation.orientation,
      );
      const supportEstimation = this.supportEstimator.estimateSupport(triangles, bestEvaluation);
      const riskAnalysis = this.riskAnalyzer.analyzeRisk(
        triangles,
        bestEvaluation,
        supportEstimation,
      );
      this.logger.log('Detailed analysis completed');

      // Step 8: Prepare alternative orientations
      const alternativeOrientations = scoredOrientations.slice(1, 4).map((scored) => ({
        rotationX: scored.orientation.rotationX,
        rotationY: scored.orientation.rotationY,
        rotationZ: scored.orientation.rotationZ,
        score: scored.totalScore,
        explanation: scored.explanation,
      }));

      this.logger.log(
        `Optimization complete. Best score: ${bestOrientation.totalScore.toFixed(1)}`,
      );

      return {
        recommendedOrientation: {
          rotationX: bestOrientation.orientation.rotationX,
          rotationY: bestOrientation.orientation.rotationY,
          rotationZ: bestOrientation.orientation.rotationZ,
        },
        score: bestOrientation.totalScore,
        explanation: bestOrientation.explanation,
        alternativeOrientations,
        analysis: {
          supportVolumeCm3: supportEstimation.supportVolumeCm3,
          supportPercentage: supportEstimation.supportPercentage,
          supportDifficulty: supportEstimation.supportDifficulty,
          estimatedHeight: bestEvaluation.height,
          contactArea: bestEvaluation.contactArea,
          riskPercentage: riskAnalysis.riskPercentage,
          riskFactors: riskAnalysis.riskFactors,
        },
      };
    } catch (error) {
      this.logger.error('Orientation optimization failed:', error);
      throw error;
    }
  }

  private async evaluateOrientations(
    triangles: Triangle[],
    orientations: Array<{
      rotationX: number;
      rotationY: number;
      rotationZ: number;
      normal: { x: number; y: number; z: number };
      source: string;
    }>,
    config: OrientationOptimizerConfig,
  ): Promise<
    Array<{
      orientation: {
        rotationX: number;
        rotationY: number;
        rotationZ: number;
        normal: { x: number; y: number; z: number };
        source: string;
      };
      totalScore: number;
      explanation: string;
    }>
  > {
    const scoredOrientations = [];

    for (const orientation of orientations) {
      try {
        const evaluation = this.orientationEvaluator.evaluateOrientation(triangles, orientation);
        const supportEstimation = this.supportEstimator.estimateSupport(triangles, evaluation);
        const riskAnalysis = this.riskAnalyzer.analyzeRisk(
          triangles,
          evaluation,
          supportEstimation,
        );
        const score = this.scoringEngine.scoreOrientation(
          evaluation,
          supportEstimation,
          riskAnalysis,
          { weights: config.scoringWeights },
        );

        scoredOrientations.push({
          orientation,
          totalScore: score.totalScore,
          explanation: score.explanation,
        });
      } catch (error) {
        this.logger.warn(`Failed to evaluate orientation: ${error}`);
      }
    }

    return scoredOrientations;
  }
}
