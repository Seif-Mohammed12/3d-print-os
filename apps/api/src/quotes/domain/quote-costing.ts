/**
 * Prices a quote from slicer output and the shop's pricing rule.
 * All money is integer minor units (piasters, cents) of the tenant's currency.
 */

type Numeric = number | string | null | undefined;

export type CostingRule = {
  material_cost_per_gram: Numeric;
  machine_time_cost_per_minute: Numeric;
  electricity_cost_per_hour: Numeric;
  maintenance_cost_per_hour: Numeric;
  failure_risk_percentage: Numeric;
  post_processing_cost_per_unit: Numeric;
  post_processing_fixed_cost: Numeric;
  profit_margin_percentage: Numeric;
  minimum_price: Numeric;
};

export type CostingInput = {
  printTimeSeconds: number;
  filamentGrams: number;
  /** Heat-up, probing and part removal time the slicer does not count. */
  jobOverheadMinutes: number;
  quantity: number;
  /** Used when the rule's material_cost_per_gram is 0. */
  materialPricePerGram: Numeric;
  rule: CostingRule;
  taxRateBps: number;
  currency: string;
};

export type QuoteCosting = {
  currency: string;
  machineMinutes: number;
  rates: {
    materialCostPerGram: number;
    machineCostPerMinute: number;
    electricityCostPerHour: number;
    maintenanceCostPerHour: number;
    failureRiskPercentage: number;
    profitMarginPercentage: number;
    minimumPrice: number;
    taxRateBps: number;
  };
  materialCost: number;
  machineTimeCost: number;
  electricityCost: number;
  maintenanceCost: number;
  postProcessingCost: number;
  failureRiskCost: number;
  productionCost: number;
  profitMargin: number;
  minimumPriceApplied: boolean;
  subtotal: number;
  tax: number;
  total: number;
};

function n(value: Numeric): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateQuoteCost(input: CostingInput): QuoteCosting {
  const { rule, quantity } = input;
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('Quantity must be a positive whole number');
  }

  const materialCostPerGram = n(rule.material_cost_per_gram) || n(input.materialPricePerGram);
  const rates = {
    materialCostPerGram,
    machineCostPerMinute: n(rule.machine_time_cost_per_minute),
    electricityCostPerHour: n(rule.electricity_cost_per_hour),
    maintenanceCostPerHour: n(rule.maintenance_cost_per_hour),
    failureRiskPercentage: n(rule.failure_risk_percentage),
    profitMarginPercentage: n(rule.profit_margin_percentage),
    minimumPrice: n(rule.minimum_price),
    taxRateBps: input.taxRateBps,
  };

  // Overhead is per print job; each copy is printed as its own job.
  const machineMinutesPerPart = input.printTimeSeconds / 60 + input.jobOverheadMinutes;
  const machineMinutes = machineMinutesPerPart * quantity;
  const printHours = (input.printTimeSeconds / 3600) * quantity;

  const materialCost = Math.round(input.filamentGrams * quantity * materialCostPerGram);
  const machineTimeCost = Math.round(machineMinutes * rates.machineCostPerMinute);
  const electricityCost = Math.round(printHours * rates.electricityCostPerHour);
  const maintenanceCost = Math.round(printHours * rates.maintenanceCostPerHour);
  const postProcessingCost = Math.round(
    n(rule.post_processing_fixed_cost) + n(rule.post_processing_cost_per_unit) * quantity,
  );
  const failureRiskCost = Math.round(
    (materialCost + machineTimeCost + electricityCost + maintenanceCost) *
      (rates.failureRiskPercentage / 100),
  );

  const productionCost =
    materialCost +
    machineTimeCost +
    electricityCost +
    maintenanceCost +
    postProcessingCost +
    failureRiskCost;
  const profitMargin = Math.round(productionCost * (rates.profitMarginPercentage / 100));

  const beforeMinimum = productionCost + profitMargin;
  const minimumPriceApplied = beforeMinimum < rates.minimumPrice;
  const subtotal = Math.max(beforeMinimum, rates.minimumPrice);
  const tax = Math.round((subtotal * input.taxRateBps) / 10_000);

  return {
    currency: input.currency,
    machineMinutes: Math.round(machineMinutes),
    rates,
    materialCost,
    machineTimeCost,
    electricityCost,
    maintenanceCost,
    postProcessingCost,
    failureRiskCost,
    productionCost,
    profitMargin,
    minimumPriceApplied,
    subtotal,
    tax,
    total: subtotal + tax,
  };
}
