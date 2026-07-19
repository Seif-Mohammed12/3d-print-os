import { describe, it, expect } from 'vitest';
import { PricingCalculator } from './pricing-calculator';
import { Money, Percentage } from './value-objects';
import type { PricingRule, Discount, RushSurcharge, PriceCalculationInput } from './types';

describe('PricingCalculator', () => {
  const calculator = new PricingCalculator();

  const defaultRule: PricingRule = {
    id: 'test-rule',
    tenantId: 'tenant-1',
    shopId: null,
    materialId: null,
    printerId: null,
    priority: 0,
    materialCostPerGram: 10, // $0.10 per gram
    materialCostPerMm3: 0,
    machineTimeCostPerMinute: 50, // $0.50 per minute
    electricityCostPerHour: 100, // $1.00 per hour
    maintenanceCostPerHour: 50, // $0.50 per hour
    failureRiskPercentage: 5, // 5%
    postProcessingCostPerUnit: 100, // $1.00 per unit
    postProcessingFixedCost: 0,
    profitMarginPercentage: 20, // 20%
    minimumPrice: 500, // $5.00 minimum
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const basicInput: PriceCalculationInput = {
    tenantId: 'tenant-1',
    weightGrams: 100,
    volumeMm3: 100000,
    estimatedTimeMinutes: 60,
    quantity: 1,
  };

  describe('calculatePrice', () => {
    it('should calculate material cost from grams', () => {
      const result = calculator.calculatePrice(basicInput, defaultRule, null, null);
      expect(result.materialCost.toCents()).toBe(1000); // 100g * $0.10 = $10.00
    });

    it('should calculate machine cost from time', () => {
      const result = calculator.calculatePrice(basicInput, defaultRule, null, null);
      expect(result.machineCost.toCents()).toBe(3000); // 60min * $0.50 = $30.00
    });

    it('should calculate electricity cost from time', () => {
      const result = calculator.calculatePrice(basicInput, defaultRule, null, null);
      expect(result.electricityCost.toCents()).toBe(100); // 1hr * $1.00 = $1.00
    });

    it('should calculate maintenance cost from time', () => {
      const result = calculator.calculatePrice(basicInput, defaultRule, null, null);
      expect(result.maintenanceCost.toCents()).toBe(50); // 1hr * $0.50 = $0.50
    });

    it('should calculate risk cost as percentage of material + machine', () => {
      const result = calculator.calculatePrice(basicInput, defaultRule, null, null);
      const baseCost = result.materialCost.add(result.machineCost);
      const expectedRisk = Percentage.fromValue(5).of(baseCost);
      expect(result.riskCost.toCents()).toBe(expectedRisk.toCents());
    });

    it('should calculate post-processing cost', () => {
      const result = calculator.calculatePrice(basicInput, defaultRule, null, null);
      expect(result.postProcessingCost.toCents()).toBe(100); // 1 unit * $1.00 = $1.00
    });

    it('should calculate profit margin', () => {
      const result = calculator.calculatePrice(basicInput, defaultRule, null, null);
      expect(result.profit.toCents()).toBeGreaterThan(0);
    });

    it('should apply minimum price when calculated price is below minimum', () => {
      const cheapRule = { ...defaultRule, materialCostPerGram: 0, machineTimeCostPerMinute: 0 };
      const result = calculator.calculatePrice(basicInput, cheapRule, null, null);
      expect(result.finalPrice.toCents()).toBeGreaterThanOrEqual(500);
    });

    it('should calculate correct final price', () => {
      const result = calculator.calculatePrice(basicInput, defaultRule, null, null);
      expect(result.finalPrice.toCents()).toBeGreaterThan(0);
    });

    it('should handle quantity multiplier', () => {
      const multiInput = { ...basicInput, quantity: 5 };
      const result = calculator.calculatePrice(multiInput, defaultRule, null, null);
      const singleResult = calculator.calculatePrice(basicInput, defaultRule, null, null);
      expect(result.materialCost.toCents()).toBe(singleResult.materialCost.toCents() * 5);
    });
  });

  describe('discounts', () => {
    const percentageDiscount: Discount = {
      id: 'discount-1',
      tenantId: 'tenant-1',
      shopId: null,
      code: 'SAVE10',
      discountType: 'percentage',
      discountValue: 10,
      maxUses: 100,
      currentUses: 0,
      validFrom: new Date(),
      validUntil: null,
      minimumOrderValue: null,
      applicableMaterials: null,
      applicablePrinters: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    const fixedDiscount: Discount = {
      ...percentageDiscount,
      id: 'discount-2',
      code: 'SAVE5',
      discountType: 'fixed',
      discountValue: 500, // $5.00
    };

    it('should apply percentage discount', () => {
      const result = calculator.calculatePrice(basicInput, defaultRule, percentageDiscount, null);
      expect(result.discountAmount.toCents()).toBeGreaterThan(0);
    });

    it('should apply fixed discount', () => {
      const result = calculator.calculatePrice(basicInput, defaultRule, fixedDiscount, null);
      expect(result.discountAmount.toCents()).toBe(500);
    });

    it('should not apply inactive discount', () => {
      const inactiveDiscount = { ...percentageDiscount, isActive: false };
      const result = calculator.calculatePrice(basicInput, defaultRule, inactiveDiscount, null);
      expect(result.discountAmount.toCents()).toBe(0);
    });

    it('should not apply expired discount', () => {
      const expiredDiscount = {
        ...percentageDiscount,
        validUntil: new Date('2020-01-01'),
      };
      const result = calculator.calculatePrice(basicInput, defaultRule, expiredDiscount, null);
      expect(result.discountAmount.toCents()).toBe(0);
    });

    it('should not apply discount with max uses exceeded', () => {
      const maxedDiscount = { ...percentageDiscount, maxUses: 10, currentUses: 10 };
      const result = calculator.calculatePrice(basicInput, defaultRule, maxedDiscount, null);
      expect(result.discountAmount.toCents()).toBe(0);
    });

    it('should not apply discount for non-applicable material', () => {
      const materialDiscount = {
        ...percentageDiscount,
        applicableMaterials: ['material-1'],
      };
      const materialInput = { ...basicInput, materialId: 'material-2' };
      const result = calculator.calculatePrice(materialInput, defaultRule, materialDiscount, null);
      expect(result.discountAmount.toCents()).toBe(0);
    });
  });

  describe('rush surcharges', () => {
    const rushSurcharge: RushSurcharge = {
      id: 'rush-1',
      tenantId: 'tenant-1',
      shopId: null,
      tierName: 'express',
      hoursBeforeDeadline: 24,
      surchargeType: 'percentage',
      surchargeValue: 25,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    it('should apply rush surcharge when deadline is within threshold', () => {
      const rushInput = { ...basicInput, rushHoursBeforeDeadline: 12 };
      const result = calculator.calculatePrice(rushInput, defaultRule, null, rushSurcharge);
      expect(result.rushSurcharge.toCents()).toBeGreaterThan(0);
    });

    it('should not apply rush surcharge when deadline is beyond threshold', () => {
      const normalInput = { ...basicInput, rushHoursBeforeDeadline: 48 };
      const result = calculator.calculatePrice(normalInput, defaultRule, null, rushSurcharge);
      expect(result.rushSurcharge.toCents()).toBe(0);
    });

    it('should not apply inactive rush surcharge', () => {
      const inactiveSurcharge = { ...rushSurcharge, isActive: false };
      const rushInput = { ...basicInput, rushHoursBeforeDeadline: 12 };
      const result = calculator.calculatePrice(rushInput, defaultRule, null, inactiveSurcharge);
      expect(result.rushSurcharge.toCents()).toBe(0);
    });
  });
});
