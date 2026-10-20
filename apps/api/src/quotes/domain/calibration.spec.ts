import { describe, expect, it } from 'vitest';

import {
  applyCalibration,
  CALIBRATION_DEFAULTS,
  computeCorrectionFactor,
  resolveCalibration,
  sampleRatios,
  summarizePrinterCalibration,
  type CalibrationSample,
} from './calibration';
import { calculateQuoteCost, type CostingRule } from './quote-costing';

let day = 0;
function sample(overrides: Partial<CalibrationSample> = {}): CalibrationSample {
  day += 1;
  return {
    printerId: 'printer-a',
    materialId: 'pla',
    estimatedPrintTimeSeconds: 3600,
    estimatedFilamentGrams: 50,
    actualPrintMinutes: 66, // 1.1x the slicer
    actualFilamentGrams: 52, // 1.04x
    recordedAt: new Date(Date.UTC(2026, 0, 1) + day * 86_400_000),
    ...overrides,
  };
}

function many(count: number, overrides: Partial<CalibrationSample> = {}) {
  return Array.from({ length: count }, () => sample(overrides));
}

describe('computeCorrectionFactor', () => {
  it('returns 1.0 and not applied with no samples', () => {
    expect(computeCorrectionFactor([], 'print_time', 'printer')).toEqual({
      factor: 1,
      sampleCount: 0,
      applied: false,
      medianRatio: null,
      scope: 'none',
    });
  });

  it('stays at 1.0 below the minimum sample count but reports progress', () => {
    const result = computeCorrectionFactor(many(4), 'print_time', 'printer');
    expect(result).toMatchObject({ factor: 1, sampleCount: 4, applied: false, scope: 'none' });
    expect(result.medianRatio).toBeCloseTo(1.1);
  });

  it('applies the median ratio once the minimum is reached', () => {
    const time = computeCorrectionFactor(many(5), 'print_time', 'printer');
    expect(time).toMatchObject({ factor: 1.1, sampleCount: 5, applied: true, scope: 'printer' });
    const grams = computeCorrectionFactor(many(5), 'filament', 'printer');
    expect(grams.factor).toBe(1.04);
  });

  it('is robust to an outlier that a mean would not survive', () => {
    const samples = [...many(5), sample({ actualPrintMinutes: 200 })]; // 3.33x restart
    const result = computeCorrectionFactor(samples, 'print_time', 'printer');
    expect(result.factor).toBe(1.1);
  });

  it('ignores impossible ratios as data-entry errors', () => {
    const samples = [
      ...many(5),
      sample({ actualPrintMinutes: 6000 }), // 100x: minutes typed as seconds
      sample({ actualPrintMinutes: 1 }),
    ];
    expect(computeCorrectionFactor(samples, 'print_time', 'printer').sampleCount).toBe(5);
  });

  it('skips samples missing the actual or the estimate for that metric', () => {
    const samples = [
      ...many(5),
      sample({ actualPrintMinutes: null }),
      sample({ estimatedPrintTimeSeconds: null }),
      sample({ estimatedPrintTimeSeconds: 0 }),
    ];
    expect(computeCorrectionFactor(samples, 'print_time', 'printer').sampleCount).toBe(5);
    // The rows without time still count for filament.
    expect(computeCorrectionFactor(samples, 'filament', 'printer').sampleCount).toBe(8);
  });

  it('uses only the most recent window of samples', () => {
    const old = many(30, { actualPrintMinutes: 90 }); // 1.5x before tuning
    const recent = many(20, { actualPrintMinutes: 63 }); // 1.05x after
    const result = computeCorrectionFactor([...recent, ...old], 'print_time', 'printer');
    expect(result).toMatchObject({ factor: 1.05, sampleCount: CALIBRATION_DEFAULTS.window });
  });

  it('clamps the factor to the configured bounds', () => {
    const slow = many(5, { actualPrintMinutes: 150 }); // 2.5x
    const result = computeCorrectionFactor(slow, 'print_time', 'printer');
    expect(result).toMatchObject({ factor: 2, medianRatio: 2.5, applied: true });
  });

  it('takes the middle pair for an even sample count', () => {
    const samples = [60, 63, 66, 69, 72, 75].map((m) => sample({ actualPrintMinutes: m }));
    expect(computeCorrectionFactor(samples, 'print_time', 'printer').factor).toBe(1.125);
  });
});

describe('sampleRatios', () => {
  it('orders newest first regardless of input order', () => {
    const older = sample({ actualPrintMinutes: 60 });
    const newer = sample({ actualPrintMinutes: 72 });
    expect(sampleRatios([older, newer], 'print_time')).toEqual([1.2, 1]);
  });
});

describe('resolveCalibration', () => {
  it('prefers the printer+material factor once that pair has enough samples', () => {
    const samples = [
      ...many(5, { materialId: 'petg', actualPrintMinutes: 72 }), // 1.2x
      ...many(5, { materialId: 'pla', actualPrintMinutes: 60 }), // 1.0x
    ];
    const result = resolveCalibration(samples, { printerId: 'printer-a', materialId: 'petg' });
    expect(result.printTime).toMatchObject({ factor: 1.2, scope: 'printer_material' });
  });

  it('falls back to the printer-wide factor when the material is thin', () => {
    const samples = [...many(6), ...many(2, { materialId: 'petg' })];
    const result = resolveCalibration(samples, { printerId: 'printer-a', materialId: 'petg' });
    expect(result.printTime).toMatchObject({ factor: 1.1, sampleCount: 8, scope: 'printer' });
  });

  it('never uses samples from another printer', () => {
    const samples = many(10, { printerId: 'printer-b' });
    const result = resolveCalibration(samples, { printerId: 'printer-a', materialId: 'pla' });
    expect(result.printTime).toMatchObject({ factor: 1, sampleCount: 0, applied: false });
  });
});

describe('applyCalibration', () => {
  const estimate = { printTimeSeconds: 7200, filamentGrams: 40.5 };

  it('multiplies the raw slicer values and records the audit trail', () => {
    const calibration = resolveCalibration(many(5), { printerId: 'printer-a', materialId: 'pla' });
    const result = applyCalibration(estimate, calibration);
    expect(result.printTimeSeconds).toBe(7920);
    expect(result.filamentGrams).toBe(42.12);
    expect(result.audit).toEqual({
      print_time: {
        raw_slicer_s: 7200,
        factor: 1.1,
        sample_count: 5,
        applied: true,
        scope: 'printer_material',
        calibrated_s: 7920,
      },
      filament: {
        raw_slicer_g: 40.5,
        factor: 1.04,
        sample_count: 5,
        applied: true,
        scope: 'printer_material',
        calibrated_g: 42.12,
      },
      window: 20,
      min_samples: 5,
    });
  });

  it('leaves the slicer values untouched with too few samples', () => {
    const calibration = resolveCalibration(many(2), { printerId: 'printer-a', materialId: 'pla' });
    const result = applyCalibration(estimate, calibration);
    expect(result.printTimeSeconds).toBe(7200);
    expect(result.filamentGrams).toBe(40.5);
    expect(result.audit.print_time).toMatchObject({ factor: 1, sample_count: 2, applied: false });
  });

  it('prices the calibrated machine time and grams, not the raw slicer values', () => {
    const rule: CostingRule = {
      material_cost_per_gram: 100,
      machine_time_cost_per_minute: 50,
      electricity_cost_per_hour: 0,
      maintenance_cost_per_hour: 0,
      failure_risk_percentage: 0,
      post_processing_cost_per_unit: 0,
      post_processing_fixed_cost: 0,
      profit_margin_percentage: 0,
      minimum_price: 0,
    };
    const calibration = resolveCalibration(many(5), { printerId: 'printer-a', materialId: 'pla' });
    const calibrated = applyCalibration(estimate, calibration);
    const cost = calculateQuoteCost({
      printTimeSeconds: calibrated.printTimeSeconds,
      filamentGrams: calibrated.filamentGrams,
      jobOverheadMinutes: 10,
      quantity: 1,
      materialPricePerGram: 0,
      rule,
      taxRateBps: 0,
      currency: 'EGP',
    });
    // 132 calibrated print minutes + 10 overhead (overhead is not scaled).
    expect(cost.machineMinutes).toBe(142);
    expect(cost.machineTimeCost).toBe(7100);
    expect(cost.materialCost).toBe(4212);
  });
});

describe('summarizePrinterCalibration', () => {
  it('reports printer-wide and per-material factors', () => {
    const samples = [...many(5), ...many(3, { materialId: 'petg' })];
    const summary = summarizePrinterCalibration('printer-a', samples);
    expect(summary.printTime).toMatchObject({ factor: 1.1, sampleCount: 8, applied: true });
    expect(summary.materials.map((m) => [m.materialId, m.printTime.applied])).toEqual([
      ['petg', false],
      ['pla', true],
    ]);
  });
});
