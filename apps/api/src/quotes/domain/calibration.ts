/**
 * Per-printer calibration of slicer estimates against real print outcomes.
 *
 * The slicer's time estimate drifts from what a printer actually does (input shaping,
 * pressure advance, firmware lookahead), so each completed job where staff recorded the
 * actual print time and/or filament becomes a sample. The correction factor is the median
 * of actual / estimated over the most recent samples: robust to the odd mis-typed or
 * failed-and-restarted job, and it tracks a printer as it is tuned.
 *
 * Samples always compare against the RAW slicer estimate, never a calibrated one, so the
 * factor does not feed back on itself.
 */

export type CalibrationMetric = 'print_time' | 'filament';

export type CalibrationScope = 'printer_material' | 'printer' | 'none';

export type CalibrationSample = {
  printerId: string;
  materialId: string;
  /** Raw slicer estimate for one print of the part. */
  estimatedPrintTimeSeconds: number | null;
  estimatedFilamentGrams: number | null;
  actualPrintMinutes: number | null;
  actualFilamentGrams: number | null;
  recordedAt: Date;
};

export type CalibrationOptions = {
  /** Most recent valid samples used per scope. */
  window: number;
  /** Samples required before a factor is applied; below this the factor is 1.0. */
  minSamples: number;
  /** Ratios outside [minRatio, maxRatio] are treated as data-entry errors and ignored. */
  minRatio: number;
  maxRatio: number;
  /** Bounds on the applied factor, so a bad streak cannot halve or triple prices. */
  minFactor: number;
  maxFactor: number;
};

export const CALIBRATION_DEFAULTS: CalibrationOptions = {
  window: 20,
  minSamples: 5,
  minRatio: 0.25,
  maxRatio: 4,
  minFactor: 0.5,
  maxFactor: 2,
};

export type CorrectionFactor = {
  /** Multiplier for the raw slicer value; 1 when not applied. */
  factor: number;
  /** Valid samples in the window that produced the factor. */
  sampleCount: number;
  applied: boolean;
  /** Median ratio before clamping, null with no samples. */
  medianRatio: number | null;
  scope: CalibrationScope;
};

export type PrinterCalibration = {
  printTime: CorrectionFactor;
  filament: CorrectionFactor;
};

const UNCALIBRATED: CorrectionFactor = {
  factor: 1,
  sampleCount: 0,
  applied: false,
  medianRatio: null,
  scope: 'none',
};

function round(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

function ratioOf(sample: CalibrationSample, metric: CalibrationMetric): number | null {
  const [actual, estimated] =
    metric === 'print_time'
      ? [
          sample.actualPrintMinutes === null ? null : sample.actualPrintMinutes * 60,
          sample.estimatedPrintTimeSeconds,
        ]
      : [sample.actualFilamentGrams, sample.estimatedFilamentGrams];
  if (actual === null || estimated === null) {
    return null;
  }
  if (!Number.isFinite(actual) || !Number.isFinite(estimated) || actual <= 0 || estimated <= 0) {
    return null;
  }
  return actual / estimated;
}

/** Valid actual/estimated ratios for one metric, newest first, at most `window` of them. */
export function sampleRatios(
  samples: readonly CalibrationSample[],
  metric: CalibrationMetric,
  options: CalibrationOptions = CALIBRATION_DEFAULTS,
): number[] {
  return [...samples]
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
    .map((sample) => ratioOf(sample, metric))
    .filter(
      (ratio): ratio is number =>
        ratio !== null && ratio >= options.minRatio && ratio <= options.maxRatio,
    )
    .slice(0, options.window);
}

/** Median ratio over the window, clamped; 1.0 until `minSamples` samples exist. */
export function computeCorrectionFactor(
  samples: readonly CalibrationSample[],
  metric: CalibrationMetric,
  scope: Exclude<CalibrationScope, 'none'>,
  options: CalibrationOptions = CALIBRATION_DEFAULTS,
): CorrectionFactor {
  const ratios = sampleRatios(samples, metric, options);
  if (ratios.length === 0) {
    return UNCALIBRATED;
  }
  const medianRatio = round(median(ratios), 4);
  if (ratios.length < options.minSamples) {
    return { factor: 1, sampleCount: ratios.length, applied: false, medianRatio, scope: 'none' };
  }
  const factor = round(Math.min(options.maxFactor, Math.max(options.minFactor, medianRatio)), 3);
  return { factor, sampleCount: ratios.length, applied: true, medianRatio, scope };
}

/**
 * Factors for a printer and material: the printer+material factor once that pair has
 * enough samples, otherwise the printer-wide factor, otherwise 1.0.
 */
export function resolveCalibration(
  samples: readonly CalibrationSample[],
  target: { printerId: string; materialId: string },
  options: CalibrationOptions = CALIBRATION_DEFAULTS,
): PrinterCalibration {
  const onPrinter = samples.filter((s) => s.printerId === target.printerId);
  const onPair = onPrinter.filter((s) => s.materialId === target.materialId);

  const resolve = (metric: CalibrationMetric): CorrectionFactor => {
    const pair = computeCorrectionFactor(onPair, metric, 'printer_material', options);
    if (pair.applied) {
      return pair;
    }
    // Printer-wide samples include the pair's, so this also reports progress to minSamples.
    return computeCorrectionFactor(onPrinter, metric, 'printer', options);
  };

  return { printTime: resolve('print_time'), filament: resolve('filament') };
}

export type CalibratedEstimate = {
  printTimeSeconds: number;
  filamentGrams: number;
  /** Stored in pricing_breakdown so an issued price can be traced to raw slicer output. */
  audit: {
    print_time: {
      raw_slicer_s: number;
      factor: number;
      sample_count: number;
      applied: boolean;
      scope: CalibrationScope;
      calibrated_s: number;
    };
    filament: {
      raw_slicer_g: number;
      factor: number;
      sample_count: number;
      applied: boolean;
      scope: CalibrationScope;
      calibrated_g: number;
    };
    window: number;
    min_samples: number;
  };
};

export function applyCalibration(
  estimate: { printTimeSeconds: number; filamentGrams: number },
  calibration: PrinterCalibration,
  options: CalibrationOptions = CALIBRATION_DEFAULTS,
): CalibratedEstimate {
  const time = calibration.printTime.applied ? calibration.printTime.factor : 1;
  const grams = calibration.filament.applied ? calibration.filament.factor : 1;
  const printTimeSeconds = Math.round(estimate.printTimeSeconds * time);
  const filamentGrams = round(estimate.filamentGrams * grams, 2);

  return {
    printTimeSeconds,
    filamentGrams,
    audit: {
      print_time: {
        raw_slicer_s: estimate.printTimeSeconds,
        factor: time,
        sample_count: calibration.printTime.sampleCount,
        applied: calibration.printTime.applied,
        scope: calibration.printTime.scope,
        calibrated_s: printTimeSeconds,
      },
      filament: {
        raw_slicer_g: estimate.filamentGrams,
        factor: grams,
        sample_count: calibration.filament.sampleCount,
        applied: calibration.filament.applied,
        scope: calibration.filament.scope,
        calibrated_g: filamentGrams,
      },
      window: options.window,
      min_samples: options.minSamples,
    },
  };
}

export type MaterialCalibrationSummary = PrinterCalibration & { materialId: string };

export type PrinterCalibrationSummary = PrinterCalibration & {
  printerId: string;
  materials: MaterialCalibrationSummary[];
};

/** Printer-wide factors plus each material's own factor, for the calibration endpoint. */
export function summarizePrinterCalibration(
  printerId: string,
  samples: readonly CalibrationSample[],
  options: CalibrationOptions = CALIBRATION_DEFAULTS,
): PrinterCalibrationSummary {
  const onPrinter = samples.filter((s) => s.printerId === printerId);
  const materialIds = [...new Set(onPrinter.map((s) => s.materialId))].sort();
  return {
    printerId,
    printTime: computeCorrectionFactor(onPrinter, 'print_time', 'printer', options),
    filament: computeCorrectionFactor(onPrinter, 'filament', 'printer', options),
    materials: materialIds.map((materialId) => {
      const onPair = onPrinter.filter((s) => s.materialId === materialId);
      return {
        materialId,
        printTime: computeCorrectionFactor(onPair, 'print_time', 'printer_material', options),
        filament: computeCorrectionFactor(onPair, 'filament', 'printer_material', options),
      };
    }),
  };
}
