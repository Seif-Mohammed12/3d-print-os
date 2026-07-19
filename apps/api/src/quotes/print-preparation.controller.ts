import { Controller, Post, Body, Logger, Get } from '@nestjs/common';
import { Public } from '../identity/auth.decorators';
import { GeometryAnalyzerService } from './services/geometry-analyzer.service';
import { OrientationOptimizerService } from './services/orientation/orientation-optimizer.service';
import { SupportAnalyzerService } from './services/support-analyzer.service';
import { PrintEstimatorService } from './services/print-estimator.service';

interface Triangle {
  v1: { x: number; y: number; z: number };
  v2: { x: number; y: number; z: number };
  v3: { x: number; y: number; z: number };
}

interface PrintPreparationRequest {
  triangles: Triangle[];
  printParameters?: {
    layerHeightMm?: number;
    infillPercentage?: number;
    nozzleSizeMm?: number;
    wallCount?: number;
    printSpeedMmPerS?: number;
    travelSpeedMmPerS?: number;
    accelerationMmPerS2?: number;
  };
  materialType?: string;
}

interface PrintPreparationResponse {
  geometry: {
    volumeMm3: number;
    surfaceAreaMm2: number;
    boundingBox: { x: number; y: number; z: number };
    triangleCount: number;
    dimensions: { width: number; height: number; depth: number };
  };
  orientation: {
    recommended: { x: number; y: number; z: number };
    score: number;
    explanation: string;
  };
  support: {
    supportVolumeCm3: number;
    supportPercentage: number;
    supportDifficulty: 'low' | 'medium' | 'high' | 'extreme';
    overhangAreaMm2: number;
    recommendations: string[];
  };
  estimation: {
    material: {
      totalMaterialVolumeCm3: number;
      estimatedWeightGrams: number;
    };
    time: {
      layers: number;
      totalTimeMinutes: number;
    };
    difficultyScore: number;
    riskPercentage: number;
    riskFactors: Array<{ factor: string; severity: string; description: string }>;
  };
  printabilityScore: number;
}

@Controller('print-preparation')
@Public()
export class PrintPreparationController {
  private readonly logger = new Logger(PrintPreparationController.name);

  constructor(
    private readonly geometryAnalyzer: GeometryAnalyzerService,
    private readonly orientationOptimizer: OrientationOptimizerService,
    private readonly supportAnalyzer: SupportAnalyzerService,
    private readonly printEstimator: PrintEstimatorService,
  ) {}

  @Get('health')
  healthCheck() {
    this.logger.log('Health check endpoint called');
    return { status: 'ok', message: 'Print preparation service is running' };
  }

  @Post('test')
  testEndpoint(@Body() request: PrintPreparationRequest) {
    this.logger.log(`Test endpoint called with ${request.triangles?.length || 0} triangles`);
    return {
      status: 'ok',
      triangleCount: request.triangles?.length || 0,
      message: 'Test endpoint working',
    };
  }

  @Post('analyze')
  async analyzePrintPreparation(
    @Body() request: PrintPreparationRequest,
  ): Promise<PrintPreparationResponse> {
    try {
      this.logger.log(
        `Analyzing print preparation for ${request.triangles?.length || 0} triangles`,
      );

      const { triangles } = request;

      if (!triangles || triangles.length === 0) {
        throw new Error('No triangles provided in request');
      }

      // Simple orientation based on bounding box
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

      const dims = {
        x: maxX - minX,
        y: maxY - minY,
        z: maxZ - minZ,
      };

      // Orient the largest dimension to be flat on the bed
      let rotationX = 0,
        rotationY = 0,
        rotationZ = 0;
      if (dims.x >= dims.y && dims.x >= dims.z) {
        rotationY = 90;
      } else if (dims.y >= dims.x && dims.y >= dims.z) {
        rotationX = 90;
      }

      return {
        geometry: {
          volumeMm3: dims.x * dims.y * dims.z,
          surfaceAreaMm2: 2 * (dims.x * dims.y + dims.x * dims.z + dims.y * dims.z),
          boundingBox: { x: dims.x, y: dims.y, z: dims.z },
          triangleCount: triangles.length,
          dimensions: { width: dims.x, height: dims.y, depth: dims.z },
        },
        orientation: {
          recommended: { x: rotationX, y: rotationY, z: rotationZ },
          score: 0.8,
          explanation: 'Simple orientation based on bounding box analysis',
        },
        support: {
          supportVolumeCm3: 0,
          supportPercentage: 0,
          supportDifficulty: 'low',
          overhangAreaMm2: 0,
          recommendations: ['Model oriented for optimal print quality'],
        },
        estimation: {
          material: {
            totalMaterialVolumeCm3: (dims.x * dims.y * dims.z) / 1000,
            estimatedWeightGrams: ((dims.x * dims.y * dims.z) / 1000) * 1.2,
          },
          time: {
            layers: Math.ceil(dims.y / 0.2),
            totalTimeMinutes: Math.ceil(dims.y / 0.2) * 1,
          },
          difficultyScore: 0.5,
          riskPercentage: 10,
          riskFactors: [],
        },
        printabilityScore: 85,
      };
    } catch (error) {
      this.logger.error('Error in print preparation analysis:', error);
      throw error;
    }
  }

  private applyOrientation(
    triangles: Triangle[],
    orientation: { x: number; y: number; z: number },
  ): Triangle[] {
    const radX = (orientation.x * Math.PI) / 180;
    const radY = (orientation.y * Math.PI) / 180;
    const radZ = (orientation.z * Math.PI) / 180;

    return triangles.map((tri) => {
      const rotatePoint = (p: { x: number; y: number; z: number }) => {
        let x = p.x;
        let y = p.y * Math.cos(radX) - p.z * Math.sin(radX);
        let z = p.y * Math.sin(radX) + p.z * Math.cos(radX);

        const tempX = x * Math.cos(radY) + z * Math.sin(radY);
        z = -x * Math.sin(radY) + z * Math.cos(radY);
        x = tempX;

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

  private calculatePrintabilityScore(
    orientationScore: number,
    supportPercentage: number,
    riskPercentage: number,
  ): number {
    // Printability score based on orientation, support, and risk
    // Higher is better (0-100)
    let score = orientationScore * 0.4; // 40% weight on orientation

    // Support penalty
    score -= supportPercentage * 0.5; // 0.5 points per 1% support

    // Risk penalty
    score -= riskPercentage * 0.3; // 0.3 points per 1% risk

    // Normalize to 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}
