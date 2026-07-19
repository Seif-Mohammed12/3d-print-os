import { Injectable, Logger } from '@nestjs/common';

interface PrintParameters {
  volumeMm3: number;
  surfaceAreaMm2: number;
  boundingBox: { x: number; y: number; z: number };
  layerHeightMm: number;
  infillPercentage: number;
  nozzleSizeMm: number;
  wallCount: number;
  printSpeedMmPerS: number;
  travelSpeedMmPerS: number;
  accelerationMmPerS2: number;
}

interface MaterialEstimation {
  shellVolumeCm3: number;
  infillVolumeCm3: number;
  supportVolumeCm3: number;
  adhesionVolumeCm3: number;
  totalMaterialVolumeCm3: number;
  estimatedWeightGrams: number;
}

interface TimeEstimation {
  layers: number;
  printTimeSeconds: number;
  travelTimeSeconds: number;
  accelerationFactor: number;
  totalTimeMinutes: number;
}

interface PrintEstimation {
  material: MaterialEstimation;
  time: TimeEstimation;
  difficultyScore: number;
  riskPercentage: number;
  riskFactors: Array<{ factor: string; severity: string; description: string }>;
}

@Injectable()
export class PrintEstimatorService {
  private readonly logger = new Logger(PrintEstimatorService.name);

  // Material densities (g/cm³)
  private readonly materialDensities = {
    PLA: 1.24,
    PETG: 1.27,
    ABS: 1.04,
    TPU: 1.21,
    ASA: 1.07,
    PETT: 1.27,
    Nylon: 1.15,
  };

  estimatePrint(
    params: PrintParameters,
    _materialType: string = 'PLA',
    overhangAnalysis?: { overhangAreaMm2: number; overhangPercentage: number },
  ): PrintEstimation {
    this.logger.log(`Estimating print for ${params.volumeMm3} mm³ model`);

    const material = this.estimateMaterial(params, overhangAnalysis);
    const time = this.estimateTime(params, material);
    const { difficultyScore, riskPercentage, riskFactors } = this.assessDifficultyAndRisk(
      params,
      time,
    );

    return {
      material,
      time,
      difficultyScore,
      riskPercentage,
      riskFactors,
    };
  }

  private estimateMaterial(
    params: PrintParameters,
    overhangAnalysis?: { overhangAreaMm2: number; overhangPercentage: number },
  ): MaterialEstimation {
    const volumeCm3 = params.volumeMm3 / 1000;

    // Calculate wall thickness
    const _wallThicknessMm = params.nozzleSizeMm * params.wallCount;

    // Estimate shell volume (perimeter + top/bottom layers)
    // Shell is typically 20-30% of total volume for standard prints
    const shellVolumeCm3 = volumeCm3 * 0.25;

    // Calculate infill volume
    // Infill is the inner volume filled at the specified percentage
    const innerVolumeCm3 = volumeCm3 - shellVolumeCm3;
    const infillVolumeCm3 = Math.max(0, innerVolumeCm3 * (params.infillPercentage / 100));

    // Calculate support volume
    let supportVolumeCm3 = 0;
    if (overhangAnalysis) {
      // Support volume = overhang area * height * support density
      const supportHeightMm = params.boundingBox.z * 0.3; // Supports typically don't go full height
      const supportVolumeMm3 = overhangAnalysis.overhangAreaMm2 * supportHeightMm * 0.05; // 5% support density
      supportVolumeCm3 = supportVolumeMm3 / 1000;
    } else {
      // Fallback: estimate based on volume percentage
      const supportPercentage = this.estimateSupportPercentage(params);
      supportVolumeCm3 = volumeCm3 * supportPercentage;
    }

    // Calculate adhesion volume (brim/skirt/raft)
    // Typically 2-5% of total volume
    const adhesionVolumeCm3 = volumeCm3 * 0.03;

    // Total material volume
    const totalMaterialVolumeCm3 =
      shellVolumeCm3 + infillVolumeCm3 + supportVolumeCm3 + adhesionVolumeCm3;

    // Add waste buffer (5% for failed prints, purging, etc.)
    const wasteBuffer = totalMaterialVolumeCm3 * 0.05;
    const finalMaterialVolumeCm3 = totalMaterialVolumeCm3 + wasteBuffer;

    // Calculate weight
    const density = this.materialDensities['PLA'] || 1.24;
    const estimatedWeightGrams = finalMaterialVolumeCm3 * density;

    return {
      shellVolumeCm3: Math.round(shellVolumeCm3 * 100) / 100,
      infillVolumeCm3: Math.round(infillVolumeCm3 * 100) / 100,
      supportVolumeCm3: Math.round(supportVolumeCm3 * 100) / 100,
      adhesionVolumeCm3: Math.round(adhesionVolumeCm3 * 100) / 100,
      totalMaterialVolumeCm3: Math.round(finalMaterialVolumeCm3 * 100) / 100,
      estimatedWeightGrams: Math.round(estimatedWeightGrams * 10) / 10,
    };
  }

  private estimateTime(params: PrintParameters, _material: MaterialEstimation): TimeEstimation {
    // Calculate number of layers
    const layers = Math.ceil(params.boundingBox.z / params.layerHeightMm);

    // More accurate slicer-like time estimation
    // Time = Volume / (PrintSpeed × LayerHeight × NozzleWidth × ExtrusionWidth)
    // This accounts for actual material being deposited per layer
    const nozzleWidthMm = params.nozzleSizeMm * 1.2; // Extrusion width
    const volumetricFlowRateMm3PerS =
      params.printSpeedMmPerS * params.layerHeightMm * nozzleWidthMm;

    // Use the actual printed volume (not the STL volume which is solid)
    // For estimation, use STL volume as a baseline but adjust for infill
    const effectiveVolumeMm3 = params.volumeMm3 * (0.3 + (params.infillPercentage / 100) * 0.7);

    // Base print time
    const printTimeSeconds = effectiveVolumeMm3 / volumetricFlowRateMm3PerS;

    // Travel time (typically 15-20% of print time for well-optimized prints)
    const travelTimeSeconds = printTimeSeconds * 0.18;

    // Acceleration factor (lower than before, modern printers are faster)
    const accelerationFactor = this.calculateAccelerationFactor(params.accelerationMmPerS2);

    // Total time
    const totalTimeSeconds = (printTimeSeconds + travelTimeSeconds) * accelerationFactor;

    return {
      layers,
      printTimeSeconds: Math.round(printTimeSeconds),
      travelTimeSeconds: Math.round(travelTimeSeconds),
      accelerationFactor,
      totalTimeMinutes: Math.round(totalTimeSeconds / 60),
    };
  }

  private calculateAccelerationFactor(accelerationMmPerS2: number): number {
    // Modern printers have better acceleration, so factor is lower
    // Fast printer (3000+ mm/s²): 1.03
    // Normal printer (1000-3000 mm/s²): 1.05
    // Slow printer (<1000 mm/s²): 1.10
    if (accelerationMmPerS2 >= 3000) return 1.03;
    if (accelerationMmPerS2 >= 1000) return 1.05;
    return 1.1;
  }

  private estimateSupportPercentage(params: PrintParameters): number {
    // Estimate support percentage based on geometry
    const aspectRatio = params.boundingBox.z / Math.max(params.boundingBox.x, params.boundingBox.y);

    // Tall objects need more support
    if (aspectRatio > 3) return 0.25; // 25%
    if (aspectRatio > 2) return 0.15; // 15%
    return 0.05; // 5% for most objects
  }

  private assessDifficultyAndRisk(
    params: PrintParameters,
    time: TimeEstimation,
  ): {
    difficultyScore: number;
    riskPercentage: number;
    riskFactors: Array<{ factor: string; severity: string; description: string }>;
  } {
    const riskFactors: Array<{ factor: string; severity: string; description: string }> = [];
    let difficultyScore = 1;
    let riskPercentage = 0;

    // Assess geometry complexity
    const surfaceToVolumeRatio = params.surfaceAreaMm2 / params.volumeMm3;

    // High surface-to-volume ratio = complex geometry (much more lenient)
    if (surfaceToVolumeRatio > 5) {
      difficultyScore += 1;
      riskFactors.push({
        factor: 'complex_geometry',
        severity: 'low',
        description: 'High surface-to-volume ratio indicates complex geometry',
      });
      riskPercentage += 5;
    }

    // Assess aspect ratio (tall/narrow objects are risky) - much more lenient
    const aspectRatio = params.boundingBox.z / Math.max(params.boundingBox.x, params.boundingBox.y);
    if (aspectRatio > 8) {
      difficultyScore += 2;
      riskFactors.push({
        factor: 'tall_narrow',
        severity: 'medium',
        description: 'Very tall narrow geometry may require support',
      });
      riskPercentage += 10;
    } else if (aspectRatio > 5) {
      difficultyScore += 1;
      riskFactors.push({
        factor: 'tall_geometry',
        severity: 'low',
        description: 'Tall geometry - may need careful orientation',
      });
      riskPercentage += 5;
    }

    // Assess large flat surfaces (warping risk) - only very large surfaces
    const maxFlatArea = Math.max(params.boundingBox.x, params.boundingBox.y) ** 2;
    if (maxFlatArea > 40000) {
      // > 200mm × 200mm
      difficultyScore += 1;
      riskFactors.push({
        factor: 'large_flat_surface',
        severity: 'low',
        description: 'Large flat surfaces may need brim or raft',
      });
      riskPercentage += 5;
    }

    // Assess small details - only extremely small
    const minDimension = Math.min(params.boundingBox.x, params.boundingBox.y, params.boundingBox.z);
    if (minDimension < 0.5) {
      difficultyScore += 2;
      riskFactors.push({
        factor: 'small_details',
        severity: 'medium',
        description: 'Very small details (<0.5mm) may not print reliably',
      });
      riskPercentage += 10;
    } else if (minDimension < 1) {
      difficultyScore += 1;
      riskFactors.push({
        factor: 'fine_details',
        severity: 'low',
        description: 'Fine details - may need smaller nozzle',
      });
      riskPercentage += 5;
    }

    // Assess print time (longer prints = higher risk) - only very long prints
    if (time.totalTimeMinutes > 1440) {
      // > 24 hours
      difficultyScore += 2;
      riskFactors.push({
        factor: 'long_print',
        severity: 'medium',
        description: 'Very long print time increases failure risk',
      });
      riskPercentage += 15;
    } else if (time.totalTimeMinutes > 720) {
      // > 12 hours
      difficultyScore += 1;
      riskFactors.push({
        factor: 'long_print',
        severity: 'low',
        description: 'Long print - ensure stable environment',
      });
      riskPercentage += 8;
    }

    // Assess thin walls
    const wallThicknessMm = params.nozzleSizeMm * params.wallCount;
    if (wallThicknessMm < 0.8) {
      difficultyScore += 1;
      riskFactors.push({
        factor: 'thin_walls',
        severity: 'low',
        description: 'Thin walls may be weak or fail to print',
      });
      riskPercentage += 5;
    }

    // Normalize difficulty score to 1-10
    difficultyScore = Math.min(10, Math.max(1, difficultyScore));

    // Normalize risk percentage to 0-100
    riskPercentage = Math.min(100, riskPercentage);

    return {
      difficultyScore,
      riskPercentage,
      riskFactors,
    };
  }
}
