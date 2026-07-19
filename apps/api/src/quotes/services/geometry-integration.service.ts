import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface GeometryMetrics {
  width_mm: number;
  height_mm: number;
  depth_mm: number;
  volume_mm3: number;
  surface_area_mm2: number;
  triangle_count: number;
}

interface MeshQuality {
  is_watertight: boolean;
  is_manifold: boolean;
  has_duplicate_faces: boolean;
  has_self_intersections: boolean;
  has_degenerate_faces: boolean;
  euler_characteristic: number;
  non_manifold_edges: number;
  non_manifold_vertices: number;
}

interface ComplexityScore {
  complexity_score: number;
  printability_score: number;
  complexity_factors: Record<string, unknown>;
  printability_issues: string[];
}

interface GeometryAnalysisResponse {
  analysis_id: string;
  model_file_id: string;
  tenant_id: string;
  status: string;
  metrics?: GeometryMetrics;
  quality?: MeshQuality;
  complexity?: ComplexityScore;
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

@Injectable()
export class GeometryIntegrationService {
  private readonly logger = new Logger(GeometryIntegrationService.name);
  private readonly baseUrl: string;

  constructor(private httpService: HttpService) {
    this.baseUrl = process.env.GEOMETRY_SERVICE_URL || 'http://localhost:8000';
  }

  async triggerAnalysis(
    modelFileId: string,
    tenantId: string,
    storageKey: string,
  ): Promise<string> {
    try {
      this.logger.log(`Triggering geometry analysis for model ${modelFileId}`);

      const response = await firstValueFrom(
        this.httpService.post<GeometryAnalysisResponse>(`${this.baseUrl}/analyze`, {
          model_file_id: modelFileId,
          tenant_id: tenantId,
          storage_key: storageKey,
        }),
      );

      return response.data.analysis_id;
    } catch (error) {
      this.logger.error(`Failed to trigger geometry analysis: ${error}`);
      throw new Error('Failed to trigger geometry analysis');
    }
  }

  async getAnalysisResults(
    analysisId: string,
    tenantId: string,
  ): Promise<GeometryAnalysisResponse | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<GeometryAnalysisResponse>(`${this.baseUrl}/analyze/${analysisId}`, {
          params: { tenant_id: tenantId },
        }),
      );

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      this.logger.error(`Failed to get geometry analysis results: ${error}`);
      throw new Error('Failed to get geometry analysis results');
    }
  }

  async getAnalysisByModel(
    modelFileId: string,
    tenantId: string,
  ): Promise<GeometryAnalysisResponse | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<GeometryAnalysisResponse>(`${this.baseUrl}/model/${modelFileId}`, {
          params: { tenant_id: tenantId },
        }),
      );

      return response.data;
    } catch (error) {
      if ((error as { response?: { status?: number } }).response?.status === 404) {
        return null;
      }
      this.logger.error(`Failed to get geometry analysis by model: ${error}`);
      throw new Error('Failed to get geometry analysis by model');
    }
  }

  calculateQuoteFromAnalysis(analysis: GeometryAnalysisResponse): {
    estimated_volume_mm3: number;
    surface_area_mm2: number;
    bounding_box_x_mm: number;
    bounding_box_y_mm: number;
    bounding_box_z_mm: number;
    difficulty_score: number;
    risk_percentage: number;
    risk_factors: Array<{ factor: string; severity: string; description: string }>;
  } {
    if (!analysis.metrics || !analysis.complexity) {
      throw new Error('Analysis results incomplete');
    }

    const riskFactors: Array<{ factor: string; severity: string; description: string }> = [];

    // Add mesh quality issues as risk factors
    if (analysis.quality) {
      if (!analysis.quality.is_watertight) {
        riskFactors.push({
          factor: 'non_watertight',
          severity: 'high',
          description: 'Mesh has holes',
        });
      }
      if (!analysis.quality.is_manifold) {
        riskFactors.push({
          factor: 'non_manifold',
          severity: 'high',
          description: 'Mesh has non-manifold geometry',
        });
      }
      if (analysis.quality.has_self_intersections) {
        riskFactors.push({
          factor: 'self_intersection',
          severity: 'medium',
          description: 'Mesh has self-intersections',
        });
      }
      if (analysis.quality.has_degenerate_faces) {
        riskFactors.push({
          factor: 'degenerate_faces',
          severity: 'low',
          description: 'Mesh has degenerate faces',
        });
      }
    }

    // Add printability issues as risk factors
    if (
      analysis.complexity.printability_issues &&
      analysis.complexity.printability_issues.length > 0
    ) {
      analysis.complexity.printability_issues.forEach((issue) => {
        riskFactors.push({ factor: 'printability', severity: 'medium', description: issue });
      });
    }

    // Calculate risk percentage based on complexity and quality
    const complexityRisk = (100 - analysis.complexity.complexity_score) / 100;
    const printabilityRisk = (100 - analysis.complexity.printability_score) / 100;
    const qualityRisk = riskFactors.filter((f) => f.severity === 'high').length * 0.2;

    const riskPercentage = Math.min(
      100,
      Math.round((complexityRisk + printabilityRisk + qualityRisk) * 100),
    );

    // Calculate difficulty score (1-10)
    const difficultyScore = Math.ceil(analysis.complexity.complexity_score / 10);

    return {
      estimated_volume_mm3: Math.round(analysis.metrics.volume_mm3),
      surface_area_mm2: Math.round(analysis.metrics.surface_area_mm2),
      bounding_box_x_mm: analysis.metrics.width_mm,
      bounding_box_y_mm: analysis.metrics.height_mm,
      bounding_box_z_mm: analysis.metrics.depth_mm,
      difficulty_score: Math.min(10, Math.max(1, difficultyScore)),
      risk_percentage: riskPercentage,
      risk_factors: riskFactors,
    };
  }
}
