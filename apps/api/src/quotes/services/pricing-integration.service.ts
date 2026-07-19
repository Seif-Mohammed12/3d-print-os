import { Injectable, Logger } from '@nestjs/common';

interface MaterialPricing {
  id: string;
  name: string;
  price_per_gram_cents: number;
  density_g_per_cm3: number;
}

interface PrinterPricing {
  id: string;
  name: string;
  hourly_rate_cents: number;
  electricity_rate_cents_per_hour: number;
  maintenance_rate_cents_per_hour: number;
}

interface PricingCalculation {
  material_cost_cents: number;
  machine_time_cost_cents: number;
  electricity_cost_cents: number;
  maintenance_cost_cents: number;
  post_processing_cost_cents: number;
  failure_risk_cost_cents: number;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
}

@Injectable()
export class PricingIntegrationService {
  private readonly logger = new Logger(PricingIntegrationService.name);

  // Default material pricing (in production, fetch from database)
  private readonly defaultMaterials: Record<string, MaterialPricing> = {
    pla: { id: 'pla', name: 'PLA', price_per_gram_cents: 20, density_g_per_cm3: 1.24 },
    abs: { id: 'abs', name: 'ABS', price_per_gram_cents: 25, density_g_per_cm3: 1.04 },
    petg: { id: 'petg', name: 'PETG', price_per_gram_cents: 28, density_g_per_cm3: 1.27 },
    resin: { id: 'resin', name: 'Resin', price_per_gram_cents: 50, density_g_per_cm3: 1.2 },
  };

  // Default printer pricing (in production, fetch from database)
  private readonly defaultPrinters: Record<string, PrinterPricing> = {
    fdm_basic: {
      id: 'fdm_basic',
      name: 'FDM Basic',
      hourly_rate_cents: 500,
      electricity_rate_cents_per_hour: 50,
      maintenance_rate_cents_per_hour: 100,
    },
    fdm_pro: {
      id: 'fdm_pro',
      name: 'FDM Pro',
      hourly_rate_cents: 1000,
      electricity_rate_cents_per_hour: 80,
      maintenance_rate_cents_per_hour: 150,
    },
    sla: {
      id: 'sla',
      name: 'SLA',
      hourly_rate_cents: 1500,
      electricity_rate_cents_per_hour: 100,
      maintenance_rate_cents_per_hour: 200,
    },
  };

  calculatePrice(
    volumeMm3: number,
    estimatedTimeMinutes: number,
    materialId?: string,
    printerId?: string,
    riskPercentage: number = 0,
    difficultyScore: number = 1,
  ): PricingCalculation {
    // Get material pricing
    const material = this.defaultMaterials[materialId ?? 'pla'] ?? this.defaultMaterials.pla;

    // Get printer pricing
    const printer =
      this.defaultPrinters[printerId ?? 'fdm_basic'] ?? this.defaultPrinters.fdm_basic;

    if (!material || !printer) {
      throw new Error('Material or printer pricing not found');
    }

    // Calculate estimated weight (volume in mm3 -> cm3 -> grams)
    const volumeCm3 = volumeMm3 / 1000;
    const estimatedWeightGrams = volumeCm3 * material.density_g_per_cm3;

    // Material cost
    const materialCostCents = Math.round(estimatedWeightGrams * material.price_per_gram_cents);

    // Machine time cost
    const estimatedTimeHours = estimatedTimeMinutes / 60;
    const machineTimeCostCents = Math.round(estimatedTimeHours * printer.hourly_rate_cents);

    // Electricity cost
    const electricityCostCents = Math.round(
      estimatedTimeHours * printer.electricity_rate_cents_per_hour,
    );

    // Maintenance cost
    const maintenanceCostCents = Math.round(
      estimatedTimeHours * printer.maintenance_rate_cents_per_hour,
    );

    // Post-processing cost (based on difficulty)
    const postProcessingCostCents = Math.round(difficultyScore * 200);

    // Failure risk cost (based on risk percentage)
    const baseCost =
      materialCostCents + machineTimeCostCents + electricityCostCents + maintenanceCostCents;
    const failureRiskCostCents = Math.round(baseCost * (riskPercentage / 100));

    // Subtotal
    const subtotalCents =
      materialCostCents +
      machineTimeCostCents +
      electricityCostCents +
      maintenanceCostCents +
      postProcessingCostCents +
      failureRiskCostCents;

    // Tax (assume 8% sales tax)
    const taxCents = Math.round(subtotalCents * 0.08);

    // Total
    const totalCents = subtotalCents + taxCents;

    return {
      material_cost_cents: materialCostCents,
      machine_time_cost_cents: machineTimeCostCents,
      electricity_cost_cents: electricityCostCents,
      maintenance_cost_cents: maintenanceCostCents,
      post_processing_cost_cents: postProcessingCostCents,
      failure_risk_cost_cents: failureRiskCostCents,
      subtotal_cents: subtotalCents,
      tax_cents: taxCents,
      total_cents: totalCents,
      currency: 'USD',
    };
  }

  calculateEstimatedTime(
    volumeMm3: number,
    layerHeightMm: number = 0.2,
    infillPercentage: number = 20,
  ): number {
    // Simplified time estimation based on volume and print settings
    // In production, use more sophisticated algorithm based on slicer results

    const volumeCm3 = volumeMm3 / 1000;
    const baseTimeMinutes = volumeCm3 * 10; // Base: 10 minutes per cm3

    // Adjust for layer height (thinner layers = slower)
    const layerHeightFactor = 0.2 / layerHeightMm;

    // Adjust for infill (higher infill = slower)
    const infillFactor = 1 + (infillPercentage / 100) * 0.5;

    const estimatedTimeMinutes = Math.round(baseTimeMinutes * layerHeightFactor * infillFactor);

    return Math.max(5, estimatedTimeMinutes); // Minimum 5 minutes
  }

  getAvailableMaterials(): MaterialPricing[] {
    return Object.values(this.defaultMaterials);
  }

  getAvailablePrinters(): PrinterPricing[] {
    return Object.values(this.defaultPrinters);
  }
}
