export interface PricingRule {
  id: string;
  tenant_id: string;
  shop_id?: string;
  material_id?: string;
  printer_id?: string;
  priority: number;
  material_cost_per_gram: number;
  material_cost_per_mm3: number;
  machine_time_cost_per_minute: number;
  electricity_cost_per_hour: number;
  maintenance_cost_per_hour: number;
  failure_risk_percentage: number;
  post_processing_cost_per_hour: number;
  minimum_price: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePricingRuleInput {
  shop_id?: string;
  material_id?: string;
  printer_id?: string;
  priority: number;
  material_cost_per_gram: number;
  material_cost_per_mm3: number;
  machine_time_cost_per_minute: number;
  electricity_cost_per_hour: number;
  maintenance_cost_per_hour: number;
  failure_risk_percentage: number;
  post_processing_cost_per_hour: number;
  minimum_price: number;
}

export type UpdatePricingRuleInput = Partial<CreatePricingRuleInput>;

export interface PricingRuleListParams {
  page?: number;
  per_page?: number;
  shop_id?: string;
  material_id?: string;
  printer_id?: string;
}
