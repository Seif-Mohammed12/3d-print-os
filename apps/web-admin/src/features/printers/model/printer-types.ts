type Numeric = number | string;

export type PrinterStatus = 'active' | 'maintenance' | 'offline' | 'retired';
export type Technology = 'FDM' | 'SLA' | 'SLS' | 'DLP' | 'MJ' | 'PolyJet';
export type GcodeFlavor = 'klipper' | 'marlin2' | 'marlin' | 'reprapfirmware';

export type Printer = {
  id: string;
  shop_id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  technology: Technology;
  build_volume_x_mm: Numeric;
  build_volume_y_mm: Numeric;
  build_volume_z_mm: Numeric;
  nozzle_diameter_mm: Numeric | null;
  max_speed_mm_per_min: Numeric | null;
  gcode_flavor: GcodeFlavor;
  max_acceleration_mm_s2: Numeric | null;
  max_feedrate_mm_s: Numeric | null;
  job_overhead_minutes: number;
  slicer_overrides: Record<string, number | boolean | string>;
  status: PrinterStatus;
  location: string | null;
  notes: string | null;
  created_at: string;
};

export type PrinterInput = {
  shopId?: string;
  name?: string;
  manufacturer?: string;
  model?: string;
  technology?: Technology;
  buildVolumeXMm?: number;
  buildVolumeYMm?: number;
  buildVolumeZMm?: number;
  nozzleDiameterMm?: number;
  gcodeFlavor?: GcodeFlavor;
  maxAccelerationMmS2?: number;
  maxFeedrateMmS?: number;
  jobOverheadMinutes?: number;
  status?: PrinterStatus;
  location?: string;
  notes?: string;
};

export type PrinterProfile = {
  id: string;
  printer_id: string;
  name: string;
  material_type: string;
  layer_height_mm: Numeric;
  infill_percentage: number;
  wall_count: number | null;
  top_layers: number | null;
  bottom_layers: number | null;
  nozzle_temperature_celsius: number | null;
  bed_temperature_celsius: number | null;
  print_speed_mm_per_min: Numeric | null;
  travel_speed_mm_per_min: Numeric | null;
  support_angle_degrees: Numeric | null;
  infill_pattern: string | null;
  is_default: boolean;
  is_active: boolean;
};

export type PrinterProfileInput = {
  name?: string;
  materialType?: string;
  layerHeightMm?: number;
  infillPercentage?: number;
  wallCount?: number;
  topLayers?: number;
  bottomLayers?: number;
  nozzleTemperatureCelsius?: number;
  bedTemperatureCelsius?: number;
  printSpeedMmPerMin?: number;
  travelSpeedMmPerMin?: number;
  supportAngleDegrees?: number;
  infillPattern?: string;
  isDefault?: boolean;
  isActive?: boolean;
};

export type CalibrationFactor = {
  factor: number;
  applied: boolean;
  sample_count: number;
  median_ratio: number | null;
  scope: string;
};

export type PrinterCalibration = {
  printer_id: string;
  printer_name: string;
  printer_status: string;
  print_time: CalibrationFactor;
  filament: CalibrationFactor;
  materials: Array<{
    material_id: string;
    material_name: string | null;
    print_time: CalibrationFactor;
    filament: CalibrationFactor;
  }>;
};

export const PRINTER_STATUS_LABEL: Record<PrinterStatus, string> = {
  active: 'Active',
  maintenance: 'Maintenance',
  offline: 'Offline',
  retired: 'Retired',
};

export const INFILL_PATTERNS = [
  'grid',
  'gyroid',
  'rectilinear',
  'cubic',
  'adaptivecubic',
  'supportcubic',
  'honeycomb',
  'triangles',
  'lightning',
  'line',
] as const;
