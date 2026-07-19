import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';

import { MaterialService } from '../../materials/services/material.service';
import type { Material } from '../../materials/repositories/material.repository';

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

  constructor(@Inject(MaterialService) private materialService: MaterialService) {}

  async calculatePrice(
    volumeMm3: number,
    estimatedTimeMinutes: number,
    materialId?: string,
    printerId?: string,
    riskPercentage: number = 0,
    difficultyScore: number = 1,
    tenantId?: string,
  ): Promise<PricingCalculation> {
    // Get material pricing from database
    let material: Material | null = null;
    if (materialId && tenantId) {
      try {
        material = await this.materialService.findById(materialId, tenantId);
      } catch (error) {
        this.logger.warn(`Material ${materialId} not found, using fallback pricing`);
      }
    }

    // Fallback to default if material not found or no tenantId
    if (!material) {
      // Use default PLA pricing as fallback
      material = {
        id: 'default',
        tenant_id: '',
        name: 'Default PLA',
        brand: null,
        material_type: 'PLA',
        color: null,
        color_code: null,
        density_g_per_cm3: 1.24,
        price_per_gram_cents: 20,
        price_per_kg_cents: 20000,
        nozzle_temperature_min_celsius: null,
        nozzle_temperature_max_celsius: null,
        bed_temperature_min_celsius: null,
        bed_temperature_max_celsius: null,
        chamber_temperature_celsius: null,
        recommended_layer_height_mm: null,
        recommended_infill_percentage: null,
        print_speed_mm_per_min: null,
        tensile_strength_mpa: null,
        flexural_strength_mpa: null,
        impact_strength_j_per_m: null,
        elongation_at_break_percentage: null,
        storage_conditions: null,
        shelf_life_months: null,
        is_active: true,
        notes: null,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
    }

    // Get printer pricing
    const printer =
      this.defaultPrinters[printerId ?? 'fdm_basic'] ?? this.defaultPrinters.fdm_basic;

    if (!printer) {
      throw new Error('Printer pricing not found');
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

  getAvailablePrinters(): PrinterPricing[] {
    return Object.values(this.defaultPrinters);
  }
}
