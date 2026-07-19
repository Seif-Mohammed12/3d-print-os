// Domain types for pricing module

export type Money = number; // in minor currency units (cents)

export type Percentage = number; // 0-100

export type DiscountType = 'percentage' | 'fixed';

export type SurchargeType = 'percentage' | 'fixed';

export interface PricingRule {
  id: string;
  tenantId: string;
  shopId: string | null;
  materialId: string | null;
  printerId: string | null;
  priority: number;
  materialCostPerGram: Money;
  materialCostPerMm3: Money;
  machineTimeCostPerMinute: Money;
  electricityCostPerHour: Money;
  maintenanceCostPerHour: Money;
  failureRiskPercentage: Percentage;
  postProcessingCostPerUnit: Money;
  postProcessingFixedCost: Money;
  profitMarginPercentage: Percentage;
  minimumPrice: Money;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Discount {
  id: string;
  tenantId: string;
  shopId: string | null;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses: number | null;
  currentUses: number;
  validFrom: Date;
  validUntil: Date | null;
  minimumOrderValue: Money | null;
  applicableMaterials: string[] | null;
  applicablePrinters: string[] | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface RushSurcharge {
  id: string;
  tenantId: string;
  shopId: string | null;
  tierName: string;
  hoursBeforeDeadline: number;
  surchargeType: SurchargeType;
  surchargeValue: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface PriceCalculationInput {
  tenantId: string;
  shopId?: string;
  materialId?: string;
  printerId?: string;
  weightGrams: number;
  volumeMm3: number;
  estimatedTimeMinutes: number;
  quantity: number;
  discountCode?: string;
  rushHoursBeforeDeadline?: number;
}

export interface PriceBreakdown {
  materialCost: Money;
  machineCost: Money;
  electricityCost: Money;
  maintenanceCost: Money;
  riskCost: Money;
  postProcessingCost: Money;
  subtotal: Money;
  discountAmount: Money;
  rushSurcharge: Money;
  profit: Money;
  finalPrice: Money;
}

export interface PriceCalculationResult {
  breakdown: PriceBreakdown;
  appliedRule: PricingRule | null;
  appliedDiscount: Discount | null;
  appliedRushSurcharge: RushSurcharge | null;
  currency: string;
}

export class PricingDomainError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'PricingDomainError';
  }
}
