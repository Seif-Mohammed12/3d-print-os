import { Injectable, Logger } from '@nestjs/common';

interface CostBreakdown {
  totalCostCents: number;
  subtotalCents: number;
  currency: string;
}

interface PrintEstimation {
  difficultyScore: number;
  riskPercentage: number;
}

interface PricingConfiguration {
  profitMarginPercentage: number;
  minimumPriceCents: number;
  complexityMultiplier: number;
  rushMultiplier: number;
  isRushOrder: boolean;
}

interface CustomerPricing {
  productionCostCents: number;
  profitMarginCents: number;
  complexityAdjustmentCents: number;
  rushAdjustmentCents: number;
  subtotalCents: number;
  taxCents: number;
  totalPriceCents: number;
  currency: string;
  appliedMargin: number;
  appliedMultipliers: {
    complexity: number;
    rush: number;
  };
}

@Injectable()
export class PricingEngineService {
  private readonly logger = new Logger(PricingEngineService.name);

  // Default pricing configuration
  private defaultConfiguration: PricingConfiguration = {
    profitMarginPercentage: 20, // 20% profit margin
    minimumPriceCents: 500, // $5 minimum
    complexityMultiplier: 1.0, // No complexity adjustment by default
    rushMultiplier: 1.5, // 50% premium for rush orders
    isRushOrder: false,
  };

  // Tax rate (configurable per tenant/region)
  private taxRate = 0.08; // 8%

  calculateCustomerPrice(
    costBreakdown: CostBreakdown,
    printEstimation: PrintEstimation,
    configuration?: Partial<PricingConfiguration>,
  ): CustomerPricing {
    this.logger.log(
      `Calculating customer price for ${costBreakdown.totalCostCents} cents cost, difficulty ${printEstimation.difficultyScore}`,
    );

    const config = { ...this.defaultConfiguration, ...configuration };

    // Production cost (subtotal before tax)
    const productionCostCents = costBreakdown.subtotalCents;

    // Calculate profit margin
    const profitMarginCents = Math.round(productionCostCents * (config.profitMarginPercentage / 100));

    // Calculate complexity adjustment
    // Higher difficulty = higher multiplier
    const complexityMultiplier = this.calculateComplexityMultiplier(
      printEstimation.difficultyScore,
      config.complexityMultiplier,
    );
    const complexityAdjustmentCents = Math.round(
      productionCostCents * (complexityMultiplier - 1),
    );

    // Calculate rush adjustment
    const rushMultiplier = config.isRushOrder ? config.rushMultiplier : 1.0;
    const rushAdjustmentCents = Math.round(productionCostCents * (rushMultiplier - 1));

    // Subtotal before tax
    const subtotalCents =
      productionCostCents +
      profitMarginCents +
      complexityAdjustmentCents +
      rushAdjustmentCents;

    // Apply minimum price
    const adjustedSubtotalCents = Math.max(config.minimumPriceCents, subtotalCents);

    // Calculate tax
    const taxCents = Math.round(adjustedSubtotalCents * this.taxRate);

    // Total price
    const totalPriceCents = adjustedSubtotalCents + taxCents;

    return {
      productionCostCents,
      profitMarginCents,
      complexityAdjustmentCents,
      rushAdjustmentCents,
      subtotalCents: adjustedSubtotalCents,
      taxCents,
      totalPriceCents,
      currency: costBreakdown.currency,
      appliedMargin: config.profitMarginPercentage,
      appliedMultipliers: {
        complexity: complexityMultiplier,
        rush: rushMultiplier,
      },
    };
  }

  private calculateComplexityMultiplier(difficultyScore: number, baseMultiplier: number): number {
    // Difficulty score 1-10
    // Score 1-3: no adjustment
    // Score 4-6: 10% adjustment
    // Score 7-8: 20% adjustment
    // Score 9-10: 30% adjustment
    if (difficultyScore <= 3) return baseMultiplier;
    if (difficultyScore <= 6) return baseMultiplier * 1.1;
    if (difficultyScore <= 8) return baseMultiplier * 1.2;
    return baseMultiplier * 1.3;
  }

  setDefaultConfiguration(config: Partial<PricingConfiguration>): void {
    this.defaultConfiguration = { ...this.defaultConfiguration, ...config };
  }

  setTaxRate(rate: number): void {
    this.taxRate = rate;
  }

  getQuickQuote(
    costCents: number,
    marginPercentage: number = 20,
  ): { priceCents: number; marginCents: number } {
    const marginCents = Math.round(costCents * (marginPercentage / 100));
    const subtotalCents = costCents + marginCents;
    const taxCents = Math.round(subtotalCents * this.taxRate);
    const priceCents = subtotalCents + taxCents;
    return { priceCents, marginCents };
  }
}
