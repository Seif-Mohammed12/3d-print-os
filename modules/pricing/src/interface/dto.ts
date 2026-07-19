// DTOs for pricing API

export interface CalculatePriceRequest {
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

export interface CreatePricingRuleRequest {
  tenantId: string;
  shopId?: string;
  materialId?: string;
  printerId?: string;
  priority?: number;
  materialCostPerGram?: number;
  materialCostPerMm3?: number;
  machineTimeCostPerMinute?: number;
  electricityCostPerHour?: number;
  maintenanceCostPerHour?: number;
  failureRiskPercentage?: number;
  postProcessingCostPerUnit?: number;
  postProcessingFixedCost?: number;
  profitMarginPercentage?: number;
  minimumPrice?: number;
  isActive?: boolean;
}

export interface UpdatePricingRuleRequest {
  priority?: number;
  materialCostPerGram?: number;
  materialCostPerMm3?: number;
  machineTimeCostPerMinute?: number;
  electricityCostPerHour?: number;
  maintenanceCostPerHour?: number;
  failureRiskPercentage?: number;
  postProcessingCostPerUnit?: number;
  postProcessingFixedCost?: number;
  profitMarginPercentage?: number;
  minimumPrice?: number;
  isActive?: boolean;
}

export interface CreateDiscountRequest {
  tenantId: string;
  shopId?: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses?: number;
  validFrom?: string;
  validUntil?: string;
  minimumOrderValue?: number;
  applicableMaterials?: string[];
  applicablePrinters?: string[];
  isActive?: boolean;
}

export interface CreateRushSurchargeRequest {
  tenantId: string;
  shopId?: string;
  tierName: string;
  hoursBeforeDeadline: number;
  surchargeType: 'percentage' | 'fixed';
  surchargeValue: number;
  isActive?: boolean;
}
