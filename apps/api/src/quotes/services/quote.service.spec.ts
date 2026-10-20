import { describe, expect, it, vi } from 'vitest';

import type { ModelUploadService } from '@3d-print-os/geometry';
import type { ObjectStoragePort } from '@3d-print-os/storage';

import type { CalibrationService } from '../../calibration/calibration.service';
import type { MaterialService } from '../../materials/services/material.service';
import type { OrderService } from '../../orders/services/order.service';
import type { PricingService } from '../../pricing/services/pricing.service';
import type { PrinterService } from '../../printers/services/printer.service';
import type { Quote, QuoteAnalysis, QuoteRepository } from '../repositories/quote.repository';
import { QuoteService } from './quote.service';
import type { SliceResult, SlicerClientService } from './slicer-client.service';

const TENANT = 't-1';

const uncalibrated = {
  factor: 1,
  sampleCount: 0,
  applied: false,
  medianRatio: null,
  scope: 'none' as const,
};

const slice: SliceResult = {
  slicer: { name: 'PrusaSlicer', version: '2.8.1' },
  estimate: {
    print_time_s: 3600,
    filament_mm: 4000,
    filament_cm3: 8,
    filament_g: 10,
    support_g: 0,
    layer_count: 100,
    object_height_mm: 20,
    features: [],
  },
  orientation: {
    label: 'as_is',
    rotation: [],
    size_mm: [40, 30, 20],
    estimate: null,
    score: null,
    error: null,
  },
  candidates: [],
  mesh_volume_mm3: 8000,
  mesh_is_watertight: true,
  warnings: [],
};

const rule = {
  id: 'rule-1',
  material_cost_per_gram: '100',
  machine_time_cost_per_minute: '10',
  electricity_cost_per_hour: '0',
  maintenance_cost_per_hour: '0',
  failure_risk_percentage: '0',
  post_processing_cost_per_unit: '0',
  post_processing_fixed_cost: '0',
  profit_margin_percentage: '0',
  minimum_price: '0',
};

function build(quote: Partial<Quote>) {
  const saved: QuoteAnalysis[] = [];
  const stored = {
    id: 'q1',
    status: 'pending',
    shop_id: 'shop-1',
    model_id: 'model-1',
    printer_id: 'printer-1',
    material_id: 'mat-1',
    layer_height_mm: 0.2,
    infill_percentage: 20,
    supports_mode: 'auto',
    orientation_mode: 'auto',
    quantity: 1,
    estimate_source: null,
    slice_result: null,
    ...quote,
  } as Quote;
  const repo = {
    findById: vi.fn(async () => stored),
    getPricingContext: vi.fn(async () => ({ currency: 'EGP', tax_rate_bps: 0 })),
    saveAnalysis: vi.fn(async (_id: string, _t: string, data: QuoteAnalysis) => {
      saved.push(data);
      return { ...stored, ...data } as Quote;
    }),
  };
  const slicer = { slice: vi.fn(async () => slice) };
  const service = new QuoteService(
    repo as unknown as QuoteRepository,
    slicer as unknown as SlicerClientService,
    {
      findById: vi.fn(async () => ({
        id: 'printer-1',
        technology: 'FDM',
        status: 'active',
        build_volume_x_mm: 250,
        build_volume_y_mm: 210,
        build_volume_z_mm: 220,
        nozzle_diameter_mm: 0.4,
        max_speed_mm_per_min: 12000,
        job_overhead_minutes: 0,
      })),
      getProfilesByPrinter: vi.fn(async () => []),
    } as unknown as PrinterService,
    {
      findById: vi.fn(async () => ({
        id: 'mat-1',
        material_type: 'PLA',
        density_g_per_cm3: 1.24,
        price_per_gram_cents: 100,
      })),
    } as unknown as MaterialService,
    { findApplicable: vi.fn(async () => rule) } as unknown as PricingService,
    {
      getModel: vi.fn(async () => ({
        id: 'model-1',
        status: 'uploaded',
        originalFilename: 'part.stl',
        storageBucket: 'models',
        storageKey: 'k',
      })),
    } as unknown as ModelUploadService,
    {
      createSignedDownloadUrl: vi.fn(async () => 'https://storage/part.stl'),
    } as unknown as ObjectStoragePort,
    {} as OrderService,
    {
      getCalibration: vi.fn(async () => ({ printTime: uncalibrated, filament: uncalibrated })),
    } as unknown as CalibrationService,
  );
  return { service, slicer, saved };
}

describe('QuoteService.analyzeQuote quantity', () => {
  it("prices the quote's own quantity by default", async () => {
    const { service, saved } = build({ quantity: 3 });
    await service.analyzeQuote('q1', TENANT, 'u1');
    // 10 g × 3 × 100 + 60 min × 3 × 10
    expect(saved[0]).toMatchObject({ quantity: 3, total_cents: 3000 + 1800 });
  });

  it('reuses the stored slice for a quantity-only reprice', async () => {
    const { service, slicer, saved } = build({
      estimate_source: 'slicer',
      slice_result: { ...slice, settings: { from: 'first slice' } },
    });
    await service.analyzeQuote('q1', TENANT, 'u1', { quantity: 2, reuseSlice: true });
    expect(slicer.slice).not.toHaveBeenCalled();
    expect(saved[0]).toMatchObject({
      quantity: 2,
      total_cents: 2000 + 1200,
      slice_result: { settings: { from: 'first slice' } },
    });
  });

  it('slices again when the stored price is no longer valid', async () => {
    const { service, slicer } = build({
      estimate_source: null,
      slice_result: { ...slice, settings: {} },
    });
    await service.analyzeQuote('q1', TENANT, 'u1', { quantity: 2, reuseSlice: true });
    expect(slicer.slice).toHaveBeenCalledTimes(1);
  });
});
