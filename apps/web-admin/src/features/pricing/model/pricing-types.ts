/** Money fields are integer minor units (piasters, cents); percentages are whole numbers. */
export type PricingRule = {
  id: string;
  shop_id: string | null;
  material_id: string | null;
  printer_id: string | null;
  priority: number;
  material_cost_per_gram: number;
  machine_time_cost_per_minute: number;
  electricity_cost_per_hour: number;
  maintenance_cost_per_hour: number;
  failure_risk_percentage: number;
  post_processing_cost_per_unit: number;
  post_processing_fixed_cost: number;
  profit_margin_percentage: number;
  minimum_price: number;
  is_active: boolean;
  created_at: string;
};

/** The pricing API takes snake_case input. */
export type PricingRuleInput = Partial<Omit<PricingRule, 'id' | 'created_at'>>;
