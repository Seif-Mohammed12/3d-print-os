import type { PricingRule, Discount, RushSurcharge, PriceCalculationInput } from './types';
import { Money, Percentage, PriceBreakdown } from './value-objects';

export class PricingCalculator {
  calculatePrice(
    input: PriceCalculationInput,
    rule: PricingRule | null,
    discount: Discount | null,
    rushSurcharge: RushSurcharge | null,
  ): PriceBreakdown {
    // Use default rule if none provided
    const effectiveRule = rule || this.getDefaultRule();

    // Calculate material cost
    const materialCost = this.calculateMaterialCost(input, effectiveRule);

    // Calculate machine cost
    const machineCost = this.calculateMachineCost(input, effectiveRule);

    // Calculate electricity cost
    const electricityCost = this.calculateElectricityCost(input, effectiveRule);

    // Calculate maintenance cost
    const maintenanceCost = this.calculateMaintenanceCost(input, effectiveRule);

    // Calculate risk cost
    const riskCost = this.calculateRiskCost(input, effectiveRule, materialCost, machineCost);

    // Calculate post-processing cost
    const postProcessingCost = this.calculatePostProcessingCost(input, effectiveRule);

    // Calculate discount
    const discountAmount = this.calculateDiscount(
      input,
      discount,
      materialCost,
      machineCost,
      electricityCost,
      maintenanceCost,
      riskCost,
      postProcessingCost,
    );

    // Calculate rush surcharge
    const rushSurchargeAmount = this.calculateRushSurcharge(
      input,
      rushSurcharge,
      materialCost,
      machineCost,
      electricityCost,
      maintenanceCost,
      riskCost,
      postProcessingCost,
    );

    // Create breakdown
    const breakdown = new PriceBreakdown(
      materialCost,
      machineCost,
      electricityCost,
      maintenanceCost,
      riskCost,
      postProcessingCost,
      discountAmount,
      rushSurchargeAmount,
      Percentage.fromValue(effectiveRule.profitMarginPercentage),
    );

    // Apply minimum price
    if (breakdown.finalPrice.isLessThan(Money.fromCents(effectiveRule.minimumPrice))) {
      return new PriceBreakdown(
        materialCost,
        machineCost,
        electricityCost,
        maintenanceCost,
        riskCost,
        postProcessingCost,
        discountAmount,
        rushSurchargeAmount,
        Percentage.fromValue(effectiveRule.profitMarginPercentage),
      );
    }

    return breakdown;
  }

  private calculateMaterialCost(input: PriceCalculationInput, rule: PricingRule): Money {
    // Prefer gram-based pricing, fallback to volume-based
    if (rule.materialCostPerGram > 0) {
      return Money.fromCents(rule.materialCostPerGram).multiply(input.weightGrams * input.quantity);
    }
    if (rule.materialCostPerMm3 > 0) {
      return Money.fromCents(rule.materialCostPerMm3).multiply(input.volumeMm3 * input.quantity);
    }
    return Money.fromCents(0);
  }

  private calculateMachineCost(input: PriceCalculationInput, rule: PricingRule): Money {
    return Money.fromCents(rule.machineTimeCostPerMinute).multiply(
      input.estimatedTimeMinutes * input.quantity,
    );
  }

  private calculateElectricityCost(input: PriceCalculationInput, rule: PricingRule): Money {
    const hours = input.estimatedTimeMinutes / 60;
    return Money.fromCents(rule.electricityCostPerHour).multiply(hours * input.quantity);
  }

  private calculateMaintenanceCost(input: PriceCalculationInput, rule: PricingRule): Money {
    const hours = input.estimatedTimeMinutes / 60;
    return Money.fromCents(rule.maintenanceCostPerHour).multiply(hours * input.quantity);
  }

  private calculateRiskCost(
    input: PriceCalculationInput,
    rule: PricingRule,
    materialCost: Money,
    machineCost: Money,
  ): Money {
    const baseCost = materialCost.add(machineCost);
    return Percentage.fromValue(rule.failureRiskPercentage).of(baseCost);
  }

  private calculatePostProcessingCost(input: PriceCalculationInput, rule: PricingRule): Money {
    const perUnitCost = Money.fromCents(rule.postProcessingCostPerUnit).multiply(input.quantity);
    const fixedCost = Money.fromCents(rule.postProcessingFixedCost);
    return perUnitCost.add(fixedCost);
  }

  private calculateDiscount(
    input: PriceCalculationInput,
    discount: Discount | null,
    materialCost: Money,
    machineCost: Money,
    electricityCost: Money,
    maintenanceCost: Money,
    riskCost: Money,
    postProcessingCost: Money,
  ): Money {
    if (!discount || !this.isDiscountValid(discount, input)) {
      return Money.fromCents(0);
    }

    const subtotal = materialCost
      .add(machineCost)
      .add(electricityCost)
      .add(maintenanceCost)
      .add(riskCost)
      .add(postProcessingCost);

    if (discount.discountType === 'percentage') {
      return Percentage.fromValue(discount.discountValue).of(subtotal);
    } else {
      return Money.fromCents(discount.discountValue);
    }
  }

  private isDiscountValid(discount: Discount, input: PriceCalculationInput): boolean {
    // Check if discount is active
    if (!discount.isActive) {
      return false;
    }

    // Check validity period
    const now = new Date();
    if (now < discount.validFrom || (discount.validUntil && now > discount.validUntil)) {
      return false;
    }

    // Check usage limits
    if (discount.maxUses !== null && discount.currentUses >= discount.maxUses) {
      return false;
    }

    // Check minimum order value
    if (discount.minimumOrderValue !== null) {
      // We can't check this without knowing the total, but this would be validated
      // in the application layer before applying the discount
    }

    // Check material applicability
    if (
      discount.applicableMaterials &&
      discount.applicableMaterials.length > 0 &&
      input.materialId &&
      !discount.applicableMaterials.includes(input.materialId)
    ) {
      return false;
    }

    // Check printer applicability
    if (
      discount.applicablePrinters &&
      discount.applicablePrinters.length > 0 &&
      input.printerId &&
      !discount.applicablePrinters.includes(input.printerId)
    ) {
      return false;
    }

    return true;
  }

  private calculateRushSurcharge(
    input: PriceCalculationInput,
    rushSurcharge: RushSurcharge | null,
    materialCost: Money,
    machineCost: Money,
    electricityCost: Money,
    maintenanceCost: Money,
    riskCost: Money,
    postProcessingCost: Money,
  ): Money {
    if (!rushSurcharge || !this.isRushSurchargeApplicable(input, rushSurcharge)) {
      return Money.fromCents(0);
    }

    const subtotal = materialCost
      .add(machineCost)
      .add(electricityCost)
      .add(maintenanceCost)
      .add(riskCost)
      .add(postProcessingCost);

    if (rushSurcharge.surchargeType === 'percentage') {
      return Percentage.fromValue(rushSurcharge.surchargeValue).of(subtotal);
    } else {
      return Money.fromCents(rushSurcharge.surchargeValue);
    }
  }

  private isRushSurchargeApplicable(
    input: PriceCalculationInput,
    rushSurcharge: RushSurcharge,
  ): boolean {
    if (!rushSurcharge.isActive) {
      return false;
    }

    if (input.rushHoursBeforeDeadline === undefined) {
      return false;
    }

    return input.rushHoursBeforeDeadline <= rushSurcharge.hoursBeforeDeadline;
  }

  private getDefaultRule(): PricingRule {
    return {
      id: 'default',
      tenantId: 'default',
      shopId: null,
      materialId: null,
      printerId: null,
      priority: 0,
      materialCostPerGram: 0,
      materialCostPerMm3: 0,
      machineTimeCostPerMinute: 0,
      electricityCostPerHour: 0,
      maintenanceCostPerHour: 0,
      failureRiskPercentage: 0,
      postProcessingCostPerUnit: 0,
      postProcessingFixedCost: 0,
      profitMarginPercentage: 20,
      minimumPrice: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
  }
}
