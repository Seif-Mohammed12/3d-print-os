type Numeric = number | string;

export const MATERIAL_TYPES = [
  'PLA',
  'PETG',
  'ABS',
  'ASA',
  'TPU',
  'Nylon',
  'Polycarbonate',
  'PVA',
  'HIPS',
  'Wood',
  'Carbon Fiber',
  'Resin',
] as const;

export type Material = {
  id: string;
  name: string;
  brand: string | null;
  material_type: string;
  color: string | null;
  color_code: string | null;
  density_g_per_cm3: Numeric;
  price_per_gram_cents: number;
  nozzle_temperature_min_celsius: number | null;
  nozzle_temperature_max_celsius: number | null;
  bed_temperature_min_celsius: number | null;
  bed_temperature_max_celsius: number | null;
  recommended_layer_height_mm: Numeric | null;
  recommended_infill_percentage: number | null;
  is_active: boolean;
  notes: string | null;
};

export type MaterialInput = {
  name?: string;
  brand?: string;
  materialType?: string;
  color?: string;
  colorCode?: string;
  densityGPerCm3?: number;
  pricePerGramCents?: number;
  nozzleTemperatureMinCelsius?: number;
  nozzleTemperatureMaxCelsius?: number;
  bedTemperatureMinCelsius?: number;
  bedTemperatureMaxCelsius?: number;
  recommendedLayerHeightMm?: number;
  recommendedInfillPercentage?: number;
  isActive?: boolean;
  notes?: string;
};
