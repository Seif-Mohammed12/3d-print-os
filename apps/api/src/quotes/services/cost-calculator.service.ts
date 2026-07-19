import { Injectable, Logger } from '@nestjs/common';

interface MaterialPricing {
  pricePerGramCents: number;
  densityGPerCm3: number;
}

interface PrinterPricing {
  hourlyRateCents: number;
  electricityRateCentsPerHour: number;
  maintenanceRateCentsPerHour: number;
  powerKw: number;
}

interface PrintEstimation {
  material: {
    totalMaterialVolumeCm3: number;
    estimatedWeightGrams: number;
  };
  time: {
    totalTimeMinutes: number;
  };
  difficultyScore: number;
  riskPercentage: number;
}

interface CostBreakdown {
  materialCostCents: number;
  machineTimeCostCents: number;
  electricityCostCents: number;
  maintenanceCostCents: number;
  postProcessingCostCents: number;
  failureRiskCostCents: number;
  subtotalCents: number;
  taxCents: number;
  totalCostCents: number;
  currency: string;
}

@Injectable()
export class CostCalculatorService {
  private readonly logger = new Logger(CostCalculatorService.name);

  // Default printer pricing (in production, fetch from database)
  private defaultPrinterPricing: PrinterPricing = {
    hourlyRateCents: 500, // $5/hour
    electricityRateCentsPerHour: 50, // $0.50/hour
    maintenanceRateCentsPerHour: 100, // $1/hour
    powerKw: 0.3, // 300W
  };

  // Default material pricing (in production, fetch from database)
  private defaultMaterialPricing: MaterialPricing = {
    pricePerGramCents: 20, // $0.20/gram
    densityGPerCm3: 1.24, // PLA
  };

  // Tax rate (configurable per tenant/region)
  private taxRate = 0.08; // 8%

  calculateCost(
    printEstimation: PrintEstimation,
    materialPricing?: MaterialPricing,
    printerPricing?: PrinterPricing,
  ): CostBreakdown {
    this.logger.log(
      `Calculating cost for ${printEstimation.material.estimatedWeightGrams}g print, ${printEstimation.time.totalTimeMinutes}min`,
    );

    const material = materialPricing || this.defaultMaterialPricing;
    const printer = printerPricing || this.defaultPrinterPricing;

    // Material cost
    const materialCostCents = Math.round(
      printEstimation.material.estimatedWeightGrams * material.pricePerGramCents,
    );

    // Machine time cost
    const printTimeHours = printEstimation.time.totalTimeMinutes / 60;
    const machineTimeCostCents = Math.round(printTimeHours * printer.hourlyRateCents);

    // Electricity cost
    const electricityCostCents = Math.round(printTimeHours * printer.electricityRateCentsPerHour);

    // Maintenance cost
    const maintenanceCostCents = Math.round(printTimeHours * printer.maintenanceRateCentsPerHour);

    // Post-processing cost (based on difficulty score)
    // Higher difficulty = more post-processing needed
    const postProcessingCostCents = Math.round(printEstimation.difficultyScore * 200);

    // Failure risk cost
    // Higher risk percentage = higher cost to account for potential reprints
    const baseCost =
      materialCostCents + machineTimeCostCents + electricityCostCents + maintenanceCostCents;
    const failureRiskCostCents = Math.round(baseCost * (printEstimation.riskPercentage / 100));

    // Subtotal
    const subtotalCents =
      materialCostCents +
      machineTimeCostCents +
      electricityCostCents +
      maintenanceCostCents +
      postProcessingCostCents +
      failureRiskCostCents;

    // Tax
    const taxCents = Math.round(subtotalCents * this.taxRate);

    // Total cost
    const totalCostCents = subtotalCents + taxCents;

    return {
      materialCostCents,
      machineTimeCostCents,
      electricityCostCents,
      maintenanceCostCents,
      postProcessingCostCents,
      failureRiskCostCents,
      subtotalCents,
      taxCents,
      totalCostCents,
      currency: 'USD',
    };
  }

  calculateMaterialCost(volumeCm3: number, materialPricing?: MaterialPricing): number {
    const material = materialPricing || this.defaultMaterialPricing;
    const weightGrams = volumeCm3 * material.densityGPerCm3;
    return Math.round(weightGrams * material.pricePerGramCents);
  }

  calculateTimeCost(minutes: number, printerPricing?: PrinterPricing): number {
    const printer = printerPricing || this.defaultPrinterPricing;
    const hours = minutes / 60;
    return Math.round(hours * printer.hourlyRateCents);
  }

  setDefaultPrinterPricing(pricing: PrinterPricing): void {
    this.defaultPrinterPricing = pricing;
  }

  setDefaultMaterialPricing(pricing: MaterialPricing): void {
    this.defaultMaterialPricing = pricing;
  }

  setTaxRate(rate: number): void {
    this.taxRate = rate;
  }
}
