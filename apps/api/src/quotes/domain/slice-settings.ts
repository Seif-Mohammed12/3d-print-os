/**
 * Builds the geometry-service slice request settings from the shop's stored printer,
 * printer profile, material and the quote's own choices.
 *
 * Precedence for process settings: quote → printer profile (for the material type) →
 * material recommendation → default. pg returns NUMERIC columns as strings, so every
 * numeric input is coerced here.
 */

export type SupportsMode = 'auto' | 'buildplate_only' | 'off';
export type OrientationMode = 'auto' | 'as_is';

type Numeric = number | string | null | undefined;

export type SlicePrinterInput = {
  build_volume_x_mm: Numeric;
  build_volume_y_mm: Numeric;
  build_volume_z_mm: Numeric;
  nozzle_diameter_mm: Numeric;
  max_speed_mm_per_min: Numeric;
  gcode_flavor?: string | null;
  max_acceleration_mm_s2?: Numeric;
  max_feedrate_mm_s?: Numeric;
  slicer_overrides?: Record<string, unknown> | null;
};

export type SliceProfileInput = {
  layer_height_mm: Numeric;
  infill_percentage: Numeric;
  wall_count: Numeric;
  top_layers: Numeric;
  bottom_layers: Numeric;
  nozzle_temperature_celsius: Numeric;
  bed_temperature_celsius: Numeric;
  print_speed_mm_per_min: Numeric;
  travel_speed_mm_per_min: Numeric;
  support_angle_degrees: Numeric;
  infill_pattern?: string | null;
  slicer_overrides?: Record<string, unknown> | null;
};

export type SliceMaterialInput = {
  density_g_per_cm3: Numeric;
  nozzle_temperature_min_celsius: Numeric;
  nozzle_temperature_max_celsius: Numeric;
  bed_temperature_min_celsius: Numeric;
  bed_temperature_max_celsius: Numeric;
  recommended_layer_height_mm: Numeric;
  recommended_infill_percentage: Numeric;
};

export type SliceQuoteInput = {
  layer_height_mm: Numeric;
  infill_percentage: Numeric;
  supports_mode: SupportsMode;
};

export type SliceSettings = {
  machine: {
    bed_x_mm: number;
    bed_y_mm: number;
    max_height_mm: number;
    nozzle_diameter_mm: number;
    gcode_flavor: string;
    max_acceleration_mm_s2: number;
    max_feedrate_xy_mm_s: number;
  };
  process: {
    layer_height_mm: number;
    perimeters: number;
    top_layers: number;
    bottom_layers: number;
    infill_percent: number;
    infill_pattern?: string;
    supports: SupportsMode;
    support_threshold_deg: number;
    perimeter_speed?: number;
    external_perimeter_speed?: number;
    infill_speed?: number;
    solid_infill_speed?: number;
    top_solid_infill_speed?: number;
    support_speed?: number;
    travel_speed?: number;
  };
  filament: {
    density_g_cm3: number;
    nozzle_temp_c: number;
    bed_temp_c: number;
  };
  overrides: Record<string, unknown>;
};

export type BuiltSliceSettings = {
  settings: SliceSettings;
  /** Missing shop data that fell back to generic defaults; surfaced on the quote. */
  assumptions: string[];
};

const DEFAULT_ACCELERATION = 3000;
const DEFAULT_FEEDRATE = 300;

function num(value: Numeric): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function firstDefined(...values: Numeric[]): number | undefined {
  for (const value of values) {
    const parsed = num(value);
    if (parsed !== undefined) {
      return parsed;
    }
  }
  return undefined;
}

function midpoint(min: Numeric, max: Numeric): number | undefined {
  const lo = num(min);
  const hi = num(max);
  if (lo !== undefined && hi !== undefined) {
    return Math.round((lo + hi) / 2);
  }
  return lo ?? hi;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildSliceSettings(input: {
  printer: SlicePrinterInput;
  profile: SliceProfileInput | null;
  material: SliceMaterialInput;
  quote: SliceQuoteInput;
}): BuiltSliceSettings {
  const { printer, profile, material, quote } = input;
  const assumptions: string[] = [];

  const bedX = num(printer.build_volume_x_mm);
  const bedY = num(printer.build_volume_y_mm);
  const bedZ = num(printer.build_volume_z_mm);
  const density = num(material.density_g_per_cm3);
  if (!bedX || !bedY || !bedZ) {
    throw new Error('Printer build volume is not configured');
  }
  if (!density) {
    throw new Error('Material density is not configured');
  }

  let nozzle = num(printer.nozzle_diameter_mm);
  if (!nozzle) {
    nozzle = 0.4;
    assumptions.push('Printer nozzle diameter not set; assumed 0.4 mm');
  }

  let acceleration = num(printer.max_acceleration_mm_s2);
  if (!acceleration) {
    acceleration = DEFAULT_ACCELERATION;
    assumptions.push(
      `Printer max acceleration not set; assumed ${DEFAULT_ACCELERATION} mm/s² (time estimate may be off)`,
    );
  }

  const maxSpeedPerMin = num(printer.max_speed_mm_per_min);
  let feedrate =
    num(printer.max_feedrate_mm_s) ?? (maxSpeedPerMin ? maxSpeedPerMin / 60 : undefined);
  if (!feedrate) {
    feedrate = DEFAULT_FEEDRATE;
    assumptions.push(`Printer max speed not set; assumed ${DEFAULT_FEEDRATE} mm/s`);
  }

  if (!profile) {
    assumptions.push('No printer profile for this material; using generic process settings');
  }

  const layerHeight =
    firstDefined(
      quote.layer_height_mm,
      profile?.layer_height_mm,
      material.recommended_layer_height_mm,
    ) ?? 0.2;
  const infill =
    firstDefined(
      quote.infill_percentage,
      profile?.infill_percentage,
      material.recommended_infill_percentage,
    ) ?? 20;

  const process: SliceSettings['process'] = {
    layer_height_mm: layerHeight,
    perimeters: firstDefined(profile?.wall_count) ?? 2,
    top_layers: firstDefined(profile?.top_layers) ?? 4,
    bottom_layers: firstDefined(profile?.bottom_layers) ?? 4,
    infill_percent: infill,
    supports: quote.supports_mode,
    support_threshold_deg: firstDefined(profile?.support_angle_degrees) ?? 50,
  };
  if (profile?.infill_pattern) {
    process.infill_pattern = profile.infill_pattern;
  }

  const printSpeedPerMin = num(profile?.print_speed_mm_per_min);
  if (printSpeedPerMin) {
    const speed = printSpeedPerMin / 60;
    // A single "print speed" maps to the bulk features; visible surfaces print slower,
    // matching the ratios of common Creality/Klipper slicer profiles.
    process.perimeter_speed = round2(speed);
    process.infill_speed = round2(speed);
    process.solid_infill_speed = round2(speed);
    process.support_speed = round2(speed);
    process.external_perimeter_speed = round2(speed * 0.7);
    process.top_solid_infill_speed = round2(speed * 0.6);
  }
  const travelPerMin = num(profile?.travel_speed_mm_per_min);
  if (travelPerMin) {
    process.travel_speed = round2(travelPerMin / 60);
  }

  const settings: SliceSettings = {
    machine: {
      bed_x_mm: bedX,
      bed_y_mm: bedY,
      max_height_mm: bedZ,
      nozzle_diameter_mm: nozzle,
      gcode_flavor: printer.gcode_flavor ?? 'klipper',
      max_acceleration_mm_s2: acceleration,
      max_feedrate_xy_mm_s: round2(feedrate),
    },
    process,
    filament: {
      density_g_cm3: density,
      nozzle_temp_c:
        firstDefined(profile?.nozzle_temperature_celsius) ??
        midpoint(
          material.nozzle_temperature_min_celsius,
          material.nozzle_temperature_max_celsius,
        ) ??
        210,
      bed_temp_c:
        firstDefined(profile?.bed_temperature_celsius) ??
        midpoint(material.bed_temperature_min_celsius, material.bed_temperature_max_celsius) ??
        60,
    },
    overrides: {
      ...(printer.slicer_overrides ?? {}),
      ...(profile?.slicer_overrides ?? {}),
    },
  };

  return { settings, assumptions };
}
