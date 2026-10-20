import { describe, expect, it } from 'vitest';

import {
  buildSliceSettings,
  type SliceMaterialInput,
  type SlicePrinterInput,
  type SliceProfileInput,
} from './slice-settings';

const printer: SlicePrinterInput = {
  build_volume_x_mm: '220.00',
  build_volume_y_mm: '220.00',
  build_volume_z_mm: '250.00',
  nozzle_diameter_mm: '0.400',
  max_speed_mm_per_min: '30000.00',
  gcode_flavor: 'klipper',
  max_acceleration_mm_s2: '5000.00',
  max_feedrate_mm_s: null,
  slicer_overrides: { machine_max_jerk_x: 8 },
};

const material: SliceMaterialInput = {
  density_g_per_cm3: '1.240',
  nozzle_temperature_min_celsius: 200,
  nozzle_temperature_max_celsius: 220,
  bed_temperature_min_celsius: 55,
  bed_temperature_max_celsius: 65,
  recommended_layer_height_mm: '0.200',
  recommended_infill_percentage: 15,
};

const profile: SliceProfileInput = {
  layer_height_mm: '0.160',
  infill_percentage: 25,
  wall_count: 3,
  top_layers: 5,
  bottom_layers: 4,
  nozzle_temperature_celsius: 215,
  bed_temperature_celsius: null,
  print_speed_mm_per_min: '6000.00',
  travel_speed_mm_per_min: '12000.00',
  support_angle_degrees: '45.00',
  infill_pattern: 'gyroid',
  slicer_overrides: { slowdown_below_layer_time: 6 },
};

const quote = { layer_height_mm: null, infill_percentage: null, supports_mode: 'auto' as const };

describe('buildSliceSettings', () => {
  it('maps printer, profile and material with numeric coercion', () => {
    const { settings, assumptions } = buildSliceSettings({ printer, profile, material, quote });

    expect(settings.machine).toEqual({
      bed_x_mm: 220,
      bed_y_mm: 220,
      max_height_mm: 250,
      nozzle_diameter_mm: 0.4,
      gcode_flavor: 'klipper',
      max_acceleration_mm_s2: 5000,
      max_feedrate_xy_mm_s: 500,
    });
    expect(settings.process).toMatchObject({
      layer_height_mm: 0.16,
      infill_percent: 25,
      perimeters: 3,
      top_layers: 5,
      infill_pattern: 'gyroid',
      support_threshold_deg: 45,
      perimeter_speed: 100,
      external_perimeter_speed: 70,
      travel_speed: 200,
    });
    expect(settings.filament).toEqual({ density_g_cm3: 1.24, nozzle_temp_c: 215, bed_temp_c: 60 });
    expect(settings.overrides).toEqual({ machine_max_jerk_x: 8, slowdown_below_layer_time: 6 });
    expect(assumptions).toEqual([]);
  });

  it('lets the quote override layer height, infill and supports', () => {
    const { settings } = buildSliceSettings({
      printer,
      profile,
      material,
      quote: { layer_height_mm: '0.280', infill_percentage: 40, supports_mode: 'off' },
    });
    expect(settings.process.layer_height_mm).toBe(0.28);
    expect(settings.process.infill_percent).toBe(40);
    expect(settings.process.supports).toBe('off');
  });

  it('falls back to material recommendations and records assumptions', () => {
    const { settings, assumptions } = buildSliceSettings({
      printer: { ...printer, max_acceleration_mm_s2: null },
      profile: null,
      material,
      quote,
    });
    expect(settings.process.layer_height_mm).toBe(0.2);
    expect(settings.process.infill_percent).toBe(15);
    expect(settings.filament.nozzle_temp_c).toBe(210);
    expect(settings.machine.max_acceleration_mm_s2).toBe(3000);
    expect(assumptions).toHaveLength(2);
  });

  it('requires build volume and density', () => {
    expect(() =>
      buildSliceSettings({
        printer: { ...printer, build_volume_z_mm: null },
        profile,
        material,
        quote,
      }),
    ).toThrow(/build volume/);
    expect(() =>
      buildSliceSettings({
        printer,
        profile,
        material: { ...material, density_g_per_cm3: null },
        quote,
      }),
    ).toThrow(/density/);
  });
});
