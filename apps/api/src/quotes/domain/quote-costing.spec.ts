import { describe, expect, it } from 'vitest';

import { calculateQuoteCost, type CostingRule } from './quote-costing';

const rule: CostingRule = {
  material_cost_per_gram: 0,
  machine_time_cost_per_minute: 50, // 30.00 EGP/h
  electricity_cost_per_hour: 300,
  maintenance_cost_per_hour: 200,
  failure_risk_percentage: 10,
  post_processing_cost_per_unit: 500,
  post_processing_fixed_cost: 0,
  profit_margin_percentage: 30,
  minimum_price: 0,
};

describe('calculateQuoteCost', () => {
  const base = {
    printTimeSeconds: 2 * 3600,
    filamentGrams: 40,
    jobOverheadMinutes: 10,
    quantity: 1,
    materialPricePerGram: 150, // 1.50 EGP/g from the material
    rule,
    taxRateBps: 1400,
    currency: 'EGP',
  };

  it('prices every line from slicer output and stored rates', () => {
    const cost = calculateQuoteCost(base);

    expect(cost.materialCost).toBe(6000); // 40 g × 150
    expect(cost.machineMinutes).toBe(130); // 120 print + 10 overhead
    expect(cost.machineTimeCost).toBe(6500); // 130 × 50
    expect(cost.electricityCost).toBe(600); // 2 h × 300 (overhead excluded)
    expect(cost.maintenanceCost).toBe(400);
    expect(cost.postProcessingCost).toBe(500);
    expect(cost.failureRiskCost).toBe(1350); // 10% of 13 500
    expect(cost.productionCost).toBe(15_350);
    expect(cost.profitMargin).toBe(4605);
    expect(cost.subtotal).toBe(19_955);
    expect(cost.tax).toBe(2794); // 14%
    expect(cost.total).toBe(22_749);
    expect(cost.currency).toBe('EGP');
  });

  it('prefers the rule material price over the material catalogue price', () => {
    const cost = calculateQuoteCost({ ...base, rule: { ...rule, material_cost_per_gram: 200 } });
    expect(cost.materialCost).toBe(8000);
  });

  it('coerces NUMERIC strings from pg', () => {
    const cost = calculateQuoteCost({
      ...base,
      materialPricePerGram: '150',
      rule: { ...rule, machine_time_cost_per_minute: '50' },
    });
    expect(cost.materialCost).toBe(6000);
    expect(cost.machineTimeCost).toBe(6500);
  });

  it('applies the minimum price before tax', () => {
    const cost = calculateQuoteCost({
      ...base,
      printTimeSeconds: 300,
      filamentGrams: 2,
      rule: { ...rule, minimum_price: 5000 },
    });
    expect(cost.minimumPriceApplied).toBe(true);
    expect(cost.subtotal).toBe(5000);
    expect(cost.tax).toBe(700);
  });

  it('charges job overhead once per copy', () => {
    const one = calculateQuoteCost(base);
    const three = calculateQuoteCost({ ...base, quantity: 3 });
    expect(three.machineMinutes).toBe(one.machineMinutes * 3);
    expect(three.materialCost).toBe(one.materialCost * 3);
    expect(three.postProcessingCost).toBe(1500);
  });

  it('rejects invalid quantities', () => {
    expect(() => calculateQuoteCost({ ...base, quantity: 0 })).toThrow();
    expect(() => calculateQuoteCost({ ...base, quantity: 1.5 })).toThrow();
  });
});
