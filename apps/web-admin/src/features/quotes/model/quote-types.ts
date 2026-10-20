/** Mirrors the API quote row (snake_case; NUMERIC columns arrive as strings). */

export type QuoteStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
export type SupportsMode = 'auto' | 'buildplate_only' | 'off';
export type OrientationMode = 'auto' | 'as_is';

type Numeric = number | string;

export type RiskFactor = {
  factor: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
};

export type SliceFeature = { feature: string; filament_mm: number; grams: number };

export type SliceEstimate = {
  print_time_s: number;
  filament_mm: number;
  filament_cm3: number;
  filament_g: number;
  support_g: number;
  layer_count: number;
  object_height_mm: number;
  features: SliceFeature[];
};

export type SliceCandidate = {
  label: string;
  rotation: number[][];
  size_mm: number[];
  estimate: SliceEstimate | null;
  score: number | null;
  error: string | null;
};

export type SliceResult = {
  slicer: { name: string; version: string };
  estimate: SliceEstimate;
  orientation: SliceCandidate;
  candidates: SliceCandidate[];
  mesh_volume_mm3: number;
  mesh_is_watertight: boolean;
  warnings: string[];
  settings?: {
    process?: {
      layer_height_mm?: number;
      infill_percent?: number;
      perimeters?: number;
      supports?: string;
    };
  };
};

type CalibrationMetric = {
  factor: number;
  sample_count: number;
  applied: boolean;
  scope: 'printer_material' | 'printer' | 'none';
};

export type PricingBreakdown = {
  currency: string;
  machineMinutes: number;
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
  rates: { taxRateBps: number; profitMarginPercentage: number; failureRiskPercentage: number };
  job_overhead_minutes: number;
  assumptions: string[];
  calibration?: {
    print_time: CalibrationMetric & { raw_slicer_s: number; calibrated_s: number };
    filament: CalibrationMetric & { raw_slicer_g: number; calibrated_g: number };
    min_samples: number;
  };
};

export type Quote = {
  id: string;
  shop_id: string;
  customer_id: string;
  model_id: string;
  quote_number: string;
  status: QuoteStatus;
  model_filename?: string | null;
  customer_name?: string | null;

  material_id: string | null;
  printer_id: string | null;
  layer_height_mm: Numeric | null;
  infill_percentage: number | null;
  supports_mode: SupportsMode;
  orientation_mode: OrientationMode;

  estimated_weight_grams: number;
  estimated_time_minutes: number;
  bounding_box_x_mm: Numeric | null;
  bounding_box_y_mm: Numeric | null;
  bounding_box_z_mm: Numeric | null;
  difficulty_score: number | null;
  risk_percentage: number | null;
  risk_factors: RiskFactor[] | null;

  material_cost_cents: number;
  machine_time_cost_cents: number;
  post_processing_cost_cents: number;
  failure_risk_cost_cents: number;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;

  estimate_source: 'slicer' | null;
  slice_result: SliceResult | null;
  pricing_breakdown: PricingBreakdown | null;
  analyzed_at: string | null;

  internal_notes: string | null;
  customer_notes: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateQuoteInput = {
  shopId: string;
  customerId: string;
  modelId: string;
  printerId?: string;
  materialId?: string;
  layerHeightMm?: number;
  infillPercentage?: number;
  supportsMode?: SupportsMode;
  orientationMode?: OrientationMode;
  internalNotes?: string;
  customerNotes?: string;
};

export type UpdateQuoteInput = {
  printerId?: string;
  materialId?: string;
  layerHeightMm?: number;
  infillPercentage?: number;
  internalNotes?: string;
  customerNotes?: string;
};

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: 'Draft',
  pending: 'Sent',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
};
