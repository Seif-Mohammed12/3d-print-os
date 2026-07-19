import { Injectable, Logger } from '@nestjs/common';
import { GeometryAnalyzerService } from './geometry-analyzer.service';

interface Triangle {
  v1: { x: number; y: number; z: number };
  v2: { x: number; y: number; z: number };
  v3: { x: number; y: number; z: number };
}

interface Orientation {
  rotationX: number;
  rotationY: number;
  rotationZ: number;
}

interface OrientationScore {
  orientation: Orientation;
  score: number;
  supportScore: number;
  timeScore: number;
  stabilityScore: number;
  surfaceQualityScore: number;
  explanation: string;
}

interface OrientationOptimizationResult {
  recommendedOrientation: Orientation;
  score: number;
  alternativeOrientations: OrientationScore[];
  analysis: {
    supportReduction: string;
    timeReduction: string;
    stabilityImprovement: string;
    surfaceQualityImprovement: string;
  };
}

@Injectable()
export class OrientationOptimizerService {
  private readonly logger = new Logger(OrientationOptimizerService.name);

  constructor(private readonly geometryAnalyzer: GeometryAnalyzerService) {}

  optimizeOrientation(triangles: Triangle[]): OrientationOptimizationResult {
    this.logger.log(`Optimizing orientation for ${triangles.length} triangles`);

    // Generate candidate orientations (24 orientations: 6 faces × 4 rotations)
    const candidateOrientations = this.generateCandidateOrientations();

    // Score each orientation
    const scoredOrientations = candidateOrientations.map((orientation) => {
      return this.scoreOrientation(triangles, orientation);
    });

    // Sort by score (highest first)
    scoredOrientations.sort((a, b) => b.score - a.score);

    if (scoredOrientations.length === 0) {
      throw new Error('No valid orientations found');
    }

    const bestOrientation = scoredOrientations[0];
    const alternatives = scoredOrientations.slice(1, 6); // Top 5 alternatives

    if (!bestOrientation) {
      throw new Error('Failed to determine best orientation');
    }

    // Calculate improvements
    const analysis = this.calculateAnalysis(bestOrientation, alternatives);

    return {
      recommendedOrientation: bestOrientation.orientation,
      score: bestOrientation.score,
      alternativeOrientations: alternatives,
      analysis,
    };
  }

  private generateCandidateOrientations(): Orientation[] {
    const orientations: Orientation[] = [];

    // Generate 24 orientations by rotating around X, Y, Z axes
    // 6 faces (±X, ±Y, ±Z) × 4 rotations each
    const baseAngles = [0, 90, 180, 270];

    // Face combinations
    const faceCombinations = [
      { x: 0, y: 0, z: 0 }, // Original
      { x: 90, y: 0, z: 0 }, // Rotate X 90
      { x: 180, y: 0, z: 0 }, // Rotate X 180
      { x: 270, y: 0, z: 0 }, // Rotate X 270
      { x: 0, y: 90, z: 0 }, // Rotate Y 90
      { x: 0, y: 180, z: 0 }, // Rotate Y 180
      { x: 0, y: 270, z: 0 }, // Rotate Y 270
      { x: 0, y: 0, z: 90 }, // Rotate Z 90
      { x: 0, y: 0, z: 180 }, // Rotate Z 180
      { x: 0, y: 0, z: 270 }, // Rotate Z 270
    ];

    // Add combined rotations for more coverage
    for (const base of faceCombinations) {
      for (const angle of baseAngles) {
        orientations.push({
          rotationX: base.x,
          rotationY: base.y + angle,
          rotationZ: base.z,
        });
      }
    }

    // Deduplicate similar orientations
    const uniqueOrientations = orientations.filter((orientation, index, self) => {
      return (
        index ===
        self.findIndex(
          (o) =>
            o.rotationX === orientation.rotationX &&
            o.rotationY === orientation.rotationY &&
            o.rotationZ === orientation.rotationZ,
        )
      );
    });

    // Limit to 24 orientations for performance
    return uniqueOrientations.slice(0, 24);
  }

  private scoreOrientation(triangles: Triangle[], orientation: Orientation): OrientationScore {
    // Apply rotation to triangles
    const rotatedTriangles = this.applyRotation(triangles, orientation);

    // Analyze geometry
    const geometry = this.geometryAnalyzer.analyzeGeometry(rotatedTriangles);
    const overhangAnalysis = this.geometryAnalyzer.analyzeOverhangs(rotatedTriangles);

    // Calculate individual scores
    const supportScore = this.calculateSupportScore(overhangAnalysis);
    const timeScore = this.calculateTimeScore(geometry);
    const stabilityScore = this.calculateStabilityScore(geometry);
    const surfaceQualityScore = this.calculateSurfaceQualityScore(geometry, overhangAnalysis);

    // Weighted total score
    const weights = {
      support: 0.35, // Support reduction is most important
      time: 0.25, // Time optimization
      stability: 0.25, // Stability is critical
      surfaceQuality: 0.15, // Surface quality is nice but less critical
    };

    const totalScore =
      supportScore * weights.support +
      timeScore * weights.time +
      stabilityScore * weights.stability +
      surfaceQualityScore * weights.surfaceQuality;

    // Generate explanation
    const explanation = this.generateExplanation(
      supportScore,
      timeScore,
      stabilityScore,
      surfaceQualityScore,
      overhangAnalysis,
      geometry,
    );

    return {
      orientation,
      score: Math.round(totalScore),
      supportScore: Math.round(supportScore),
      timeScore: Math.round(timeScore),
      stabilityScore: Math.round(stabilityScore),
      surfaceQualityScore: Math.round(surfaceQualityScore),
      explanation,
    };
  }

  private calculateSupportScore(overhangAnalysis: { overhangPercentage: number }): number {
    // Lower overhang percentage = higher score
    // 0% overhang = 100 points
    // 50%+ overhang = 0 points
    const maxOverhang = 50;
    const score = Math.max(0, 100 - (overhangAnalysis.overhangPercentage / maxOverhang) * 100);
    return score;
  }

  private calculateTimeScore(geometry: { boundingBox: { z: number } }): number {
    // Lower Z-height = higher score (less layers = faster print)
    // Assume max reasonable height is 300mm
    const maxHeight = 300;
    const zHeight = geometry.boundingBox.z;
    const score = Math.max(0, 100 - (zHeight / maxHeight) * 100);
    return score;
  }

  private calculateStabilityScore(geometry: {
    boundingBox: { x: number; y: number; z: number };
  }): number {
    // Larger base area relative to height = higher score
    // Base area = X × Y
    const baseArea = geometry.boundingBox.x * geometry.boundingBox.y;
    const height = geometry.boundingBox.z;
    const aspectRatio = height / Math.max(geometry.boundingBox.x, geometry.boundingBox.y);

    // Score based on aspect ratio and base area
    let score = 100;

    // Penalize tall/narrow objects
    if (aspectRatio > 3) score -= 30;
    else if (aspectRatio > 2) score -= 15;
    else if (aspectRatio > 1.5) score -= 5;

    // Reward large base area
    if (baseArea > 10000)
      score += 10; // > 100mm × 100mm
    else if (baseArea > 4000) score += 5; // > 63mm × 63mm

    return Math.max(0, Math.min(100, score));
  }

  private calculateSurfaceQualityScore(
    geometry: { surfaceToVolumeRatio: number },
    overhangAnalysis: { overhangPercentage: number },
  ): number {
    // Lower surface-to-volume ratio = better (less complex)
    // Lower overhang percentage = better surface quality
    let score = 100;

    // Penalize high surface-to-volume ratio (complex geometry)
    if (geometry.surfaceToVolumeRatio > 5) score -= 20;
    else if (geometry.surfaceToVolumeRatio > 3) score -= 10;

    // Penalize high overhang percentage (stepped surfaces)
    if (overhangAnalysis.overhangPercentage > 30) score -= 20;
    else if (overhangAnalysis.overhangPercentage > 20) score -= 10;
    else if (overhangAnalysis.overhangPercentage > 10) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  private generateExplanation(
    supportScore: number,
    timeScore: number,
    stabilityScore: number,
    surfaceQualityScore: number,
    _overhangAnalysis: { overhangPercentage: number },
    _geometry: { boundingBox: { z: number } },
  ): string {
    const reasons: string[] = [];

    if (supportScore > 80) {
      reasons.push('Minimal support required');
    } else if (supportScore > 60) {
      reasons.push('Moderate support needed');
    } else {
      reasons.push('High support requirement');
    }

    if (timeScore > 80) {
      reasons.push('Optimal print height');
    } else if (timeScore > 60) {
      reasons.push('Acceptable print height');
    } else {
      reasons.push('Tall print (longer time)');
    }

    if (stabilityScore > 80) {
      reasons.push('Excellent bed adhesion');
    } else if (stabilityScore > 60) {
      reasons.push('Good stability');
    } else {
      reasons.push('May need brim/raft');
    }

    if (surfaceQualityScore > 80) {
      reasons.push('Excellent surface quality');
    } else if (surfaceQualityScore > 60) {
      reasons.push('Good surface quality');
    } else {
      reasons.push('May have visible layer lines');
    }

    return reasons.join(', ');
  }

  private applyRotation(triangles: Triangle[], orientation: Orientation): Triangle[] {
    const radX = (orientation.rotationX * Math.PI) / 180;
    const radY = (orientation.rotationY * Math.PI) / 180;
    const radZ = (orientation.rotationZ * Math.PI) / 180;

    return triangles.map((tri) => {
      const rotatePoint = (p: { x: number; y: number; z: number }) => {
        // Rotate around X
        let x = p.x;
        let y = p.y * Math.cos(radX) - p.z * Math.sin(radX);
        let z = p.y * Math.sin(radX) + p.z * Math.cos(radX);

        // Rotate around Y
        const tempX = x * Math.cos(radY) + z * Math.sin(radY);
        z = -x * Math.sin(radY) + z * Math.cos(radY);
        x = tempX;

        // Rotate around Z
        const tempX2 = x * Math.cos(radZ) - y * Math.sin(radZ);
        y = x * Math.sin(radZ) + y * Math.cos(radZ);
        x = tempX2;

        return { x, y, z };
      };

      return {
        v1: rotatePoint(tri.v1),
        v2: rotatePoint(tri.v2),
        v3: rotatePoint(tri.v3),
      };
    });
  }

  private calculateAnalysis(
    best: OrientationScore,
    alternatives: OrientationScore[],
  ): {
    supportReduction: string;
    timeReduction: string;
    stabilityImprovement: string;
    surfaceQualityImprovement: string;
  } {
    // Compare with average of alternatives
    const avgSupport =
      alternatives.reduce((sum, a) => sum + a.supportScore, 0) / alternatives.length;
    const avgTime = alternatives.reduce((sum, a) => sum + a.timeScore, 0) / alternatives.length;
    const avgStability =
      alternatives.reduce((sum, a) => sum + a.stabilityScore, 0) / alternatives.length;
    const avgSurface =
      alternatives.reduce((sum, a) => sum + a.surfaceQualityScore, 0) / alternatives.length;

    const supportDiff = Math.round(best.supportScore - avgSupport);
    const timeDiff = Math.round(best.timeScore - avgTime);
    const stabilityDiff = Math.round(best.stabilityScore - avgStability);
    const surfaceDiff = Math.round(best.surfaceQualityScore - avgSurface);

    return {
      supportReduction: supportDiff > 0 ? `${supportDiff}% better than alternatives` : 'Standard',
      timeReduction: timeDiff > 0 ? `${timeDiff}% better than alternatives` : 'Standard',
      stabilityImprovement:
        stabilityDiff > 0 ? `${stabilityDiff}% better than alternatives` : 'Standard',
      surfaceQualityImprovement:
        surfaceDiff > 0 ? `${surfaceDiff}% better than alternatives` : 'Standard',
    };
  }
}
