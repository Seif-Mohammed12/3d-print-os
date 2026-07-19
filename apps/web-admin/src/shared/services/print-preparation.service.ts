interface Triangle {
  v1: { x: number; y: number; z: number };
  v2: { x: number; y: number; z: number };
  v3: { x: number; y: number; z: number };
}

export interface PrintPreparationRequest {
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

export interface PrintPreparationResponse {
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

class PrintPreparationService {
  private readonly baseUrl = '/api/v1/quotes/print-preparation';

  async analyzePrintPreparation(
    request: PrintPreparationRequest,
  ): Promise<PrintPreparationResponse> {
    console.log('Sending request to backend:', {
      triangleCount: request.triangles.length,
      hasPrintParameters: !!request.printParameters,
      materialType: request.materialType,
    });

    const response = await fetch(`${this.baseUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response body:', errorText);
      throw new Error(
        `Failed to analyze print preparation: ${response.statusText}. Details: ${errorText}`,
      );
    }

    return response.json();
  }

  async healthCheck(): Promise<{ status: string; message: string }> {
    console.log('Calling health check endpoint');
    const response = await fetch(`${this.baseUrl}/health`);
    console.log('Health check response status:', response.status);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    const result = await response.json();
    console.log('Health check result:', result);
    return result;
  }

  async testEndpoint(
    request: PrintPreparationRequest,
  ): Promise<{ status: string; triangleCount: number; message: string }> {
    const response = await fetch(`${this.baseUrl}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`Test endpoint failed: ${response.statusText}`);
    }
    return response.json();
  }
}

export const printPreparationService = new PrintPreparationService();
