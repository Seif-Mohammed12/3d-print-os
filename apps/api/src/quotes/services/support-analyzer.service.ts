import { Injectable, Logger } from '@nestjs/common';
import { GeometryAnalyzerService } from './geometry-analyzer.service';

interface Triangle {
  v1: { x: number; y: number; z: number };
  v2: { x: number; y: number; z: number };
  v3: { x: number; y: number; z: number };
}

interface SupportAnalysis {
  supportVolumeCm3: number;
  supportPercentage: number;
  supportDifficulty: 'low' | 'medium' | 'high';
  overhangAreaMm2: number;
  criticalOverhangs: number;
  supportHeightMm: number;
  recommendations: string[];
}

interface SupportRegion {
  faceIndex: number;
  angle: number;
  area: number;
  height: number;
  difficulty: 'low' | 'medium' | 'high';
}

@Injectable()
export class SupportAnalyzerService {
  private readonly logger = new Logger(SupportAnalyzerService.name);

  constructor(private readonly geometryAnalyzer: GeometryAnalyzerService) {}

  analyzeSupport(triangles: Triangle[]): SupportAnalysis {
    this.logger.log(`Analyzing support requirements for ${triangles.length} triangles`);

    // Get overhang analysis
    const overhangAnalysis = this.geometryAnalyzer.analyzeOverhangs(triangles);
    const geometry = this.geometryAnalyzer.analyzeGeometry(triangles);

    // Calculate support volume
    const supportVolumeCm3 = this.estimateSupportVolume(
      overhangAnalysis.overhangAreaMm2,
      geometry.boundingBox,
    );

    // Calculate support percentage
    const supportPercentage = (supportVolumeCm3 / (geometry.volumeMm3 / 1000)) * 100;

    // Determine support difficulty
    const supportDifficulty = this.determineSupportDifficulty(
      supportPercentage,
      overhangAnalysis.overhangPercentage,
    );

    // Calculate support height
    const supportHeightMm = this.calculateSupportHeight(geometry.boundingBox);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      supportDifficulty,
      overhangAnalysis.overhangPercentage,
      geometry.boundingBox,
    );

    return {
      supportVolumeCm3: Math.round(supportVolumeCm3 * 100) / 100,
      supportPercentage: Math.round(supportPercentage * 100) / 100,
      supportDifficulty,
      overhangAreaMm2: overhangAnalysis.overhangAreaMm2,
      criticalOverhangs: overhangAnalysis.criticalOverhangs.length,
      supportHeightMm: Math.round(supportHeightMm),
      recommendations,
    };
  }

  analyzeSupportRegions(triangles: Triangle[]): SupportRegion[] {
    const faceNormals = this.geometryAnalyzer.analyzeGeometry(triangles).faceNormals;
    const faceAreas = this.geometryAnalyzer.analyzeGeometry(triangles).surfaceAreaMm2 / triangles.length;
    const geometry = this.geometryAnalyzer.analyzeGeometry(triangles);

    const regions: SupportRegion[] = [];

    faceNormals.forEach((normal, index) => {
      const angleFromVertical = Math.acos(normal.z) * (180 / Math.PI);

      // Only consider faces that need support (over 45 degrees)
      if (angleFromVertical > 45) {
        const difficulty = this.getRegionDifficulty(angleFromVertical);
        const height = this.estimateRegionHeight(geometry.boundingBox, normal);

        regions.push({
          faceIndex: index,
          angle: Math.round(angleFromVertical),
          area: Math.round(faceAreas),
          height: Math.round(height),
          difficulty,
        });
      }
    });

    // Sort by difficulty (high first)
    regions.sort((a, b) => {
      const difficultyOrder = { high: 3, medium: 2, low: 1 };
      return difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty];
    });

    return regions.slice(0, 50); // Limit to top 50 regions
  }

  private estimateSupportVolume(
    overhangAreaMm2: number,
    boundingBox: { x: number; y: number; z: number },
  ): number {
    // Support volume = overhang area × average support height × support density
    // Support density is typically 5-15% of solid volume
    const averageSupportHeight = boundingBox.z * 0.4; // Supports typically cover 40% of height
    const supportDensity = 0.1; // 10% density (typical for support structures)

    const supportVolumeMm3 = overhangAreaMm2 * averageSupportHeight * supportDensity;
    return supportVolumeMm3 / 1000; // Convert to cm³
  }

  private determineSupportDifficulty(
    supportPercentage: number,
    overhangPercentage: number,
  ): 'low' | 'medium' | 'high' {
    if (supportPercentage < 10 && overhangPercentage < 15) {
      return 'low';
    } else if (supportPercentage < 25 && overhangPercentage < 35) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  private calculateSupportHeight(boundingBox: { z: number }): number {
    // Support height is typically 60-80% of model height
    return boundingBox.z * 0.7;
  }

  private getRegionDifficulty(angle: number): 'low' | 'medium' | 'high' {
    if (angle < 55) return 'low';
    if (angle < 70) return 'medium';
    return 'high';
  }

  private estimateRegionHeight(
    boundingBox: { z: number },
    normal: { z: number },
  ): number {
    // Estimate height based on normal direction
    // Steeper overhangs typically need more support height
    const angleFromVertical = Math.acos(normal.z) * (180 / Math.PI);
    const heightFactor = 0.5 + (angleFromVertical / 180) * 0.5; // 0.5 to 1.0
    return boundingBox.z * heightFactor;
  }

  private generateRecommendations(
    supportDifficulty: 'low' | 'medium' | 'high',
    overhangPercentage: number,
    boundingBox: { x: number; y: number; z: number },
  ): string[] {
    const recommendations: string[] = [];

    if (supportDifficulty === 'low') {
      recommendations.push('Minimal support required');
      recommendations.push('Standard support settings should work');
    } else if (supportDifficulty === 'medium') {
      recommendations.push('Moderate support needed');
      recommendations.push('Consider support density 15-20%');
      recommendations.push('May need support interface layers');
    } else {
      recommendations.push('High support requirement');
      recommendations.push('Consider support density 20-25%');
      recommendations.push('Use support interface for better surface finish');
      recommendations.push('May need custom support settings');
    }

    if (overhangPercentage > 30) {
      recommendations.push('Consider reorientation to reduce supports');
    }

    if (boundingBox.z > 150) {
      recommendations.push('Tall model - ensure good bed adhesion');
    }

    if (boundingBox.z / Math.max(boundingBox.x, boundingBox.y) > 2) {
      recommendations.push('Tall narrow geometry - may need brim');
    }

    return recommendations;
  }
}
