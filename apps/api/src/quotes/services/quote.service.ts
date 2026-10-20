import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { GeometryDomainError, type ModelUploadService } from '@3d-print-os/geometry';
import type { ObjectStoragePort } from '@3d-print-os/storage';

import { CalibrationService } from '../../calibration/calibration.service';
import { MODEL_UPLOAD_SERVICE, OBJECT_STORAGE } from '../../geometry/geometry.tokens';
import { MaterialService } from '../../materials/services/material.service';
import { OrderService } from '../../orders/services/order.service';
import { PricingService } from '../../pricing/services/pricing.service';
import { PrinterService } from '../../printers/services/printer.service';
import { AppError } from '../../shared/errors/app.error';
import { applyCalibration } from '../domain/calibration';
import { calculateQuoteCost } from '../domain/quote-costing';
import { assessSliceRisk } from '../domain/slice-risk';
import { buildSliceSettings, type SliceProfileInput } from '../domain/slice-settings';
import type { CreateQuoteData, Quote, QuoteListParams } from '../repositories/quote.repository';
import { QuoteRepository } from '../repositories/quote.repository';
import { SlicerClientService } from './slicer-client.service';

const EDITABLE_STATUSES: ReadonlyArray<Quote['status']> = ['draft', 'pending'];
const MODEL_URL_TTL_SECONDS = 15 * 60;
const DEFAULT_JOB_OVERHEAD_MINUTES = 10;

function unprocessable(code: string, message: string): AppError {
  return new AppError({ code, message, statusCode: 422 });
}

function modelFileType(filename: string): 'stl' | 'obj' | '3mf' {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (extension === 'stl' || extension === 'obj' || extension === '3mf') {
    return extension;
  }
  throw unprocessable('quote.invalid_model', 'Only STL, OBJ and 3MF models can be quoted');
}

@Injectable()
export class QuoteService {
  constructor(
    private repo: QuoteRepository,
    private slicer: SlicerClientService,
    private printerService: PrinterService,
    private materialService: MaterialService,
    private pricingService: PricingService,
    @Inject(MODEL_UPLOAD_SERVICE) private modelUploads: ModelUploadService,
    @Inject(OBJECT_STORAGE) private storage: ObjectStoragePort,
    private orderService: OrderService,
    private calibrationService: CalibrationService,
  ) {}

  async create(data: CreateQuoteData): Promise<Quote> {
    return this.repo.create(data);
  }

  /**
   * Slice the model with the quote's printer and material, then price it from the shop's
   * pricing rule. Every number on the quote comes from the slicer's G-code statistics.
   */
  async analyzeQuote(quoteId: string, tenantId: string, userId: string | null): Promise<Quote> {
    const quote = await this.findById(quoteId, tenantId);
    if (!EDITABLE_STATUSES.includes(quote.status)) {
      throw new AppError({
        code: 'quote.not_editable',
        message: `A ${quote.status} quote cannot be re-priced`,
        statusCode: 409,
      });
    }
    if (!quote.printer_id) {
      throw unprocessable('quote.printer_required', 'Choose a printer before pricing the quote');
    }
    if (!quote.material_id) {
      throw unprocessable('quote.material_required', 'Choose a material before pricing the quote');
    }

    const [printer, material, pricingContext, calibration] = await Promise.all([
      this.printerService.findById(quote.printer_id, tenantId),
      this.materialService.findById(quote.material_id, tenantId),
      this.repo.getPricingContext(tenantId),
      this.calibrationService.getCalibration(tenantId, quote.printer_id, quote.material_id),
    ]);
    if (printer.technology !== 'FDM') {
      throw unprocessable(
        'quote.technology_unsupported',
        `Slicer quoting supports FDM printers only (printer is ${printer.technology})`,
      );
    }
    if (printer.status === 'retired') {
      throw unprocessable('quote.printer_retired', 'The selected printer is retired');
    }

    const rule = await this.pricingService.findApplicable(tenantId, {
      shopId: quote.shop_id,
      materialId: material.id,
      printerId: printer.id,
    });
    if (!rule) {
      throw unprocessable(
        'quote.pricing_rule_missing',
        'No active pricing rule applies to this shop, printer and material',
      );
    }

    const profiles = await this.printerService.getProfilesByPrinter(printer.id, tenantId);
    const profile =
      profiles.find(
        (p) =>
          p.is_active && p.material_type.toLowerCase() === material.material_type.toLowerCase(),
      ) ?? null;

    let built;
    try {
      built = buildSliceSettings({
        printer,
        profile: profile as SliceProfileInput | null,
        material,
        quote,
      });
    } catch (error) {
      throw unprocessable('quote.printer_not_configured', (error as Error).message);
    }

    const model = await this.getUploadedModel(tenantId, quote.model_id);
    const downloadUrl = await this.storage.createSignedDownloadUrl({
      bucket: model.storageBucket,
      key: model.storageKey,
      expiresInSeconds: MODEL_URL_TTL_SECONDS,
    });

    const costPerGram =
      Number(rule.material_cost_per_gram) || Number(material.price_per_gram_cents);
    const slice = await this.slicer.slice({
      tenantId,
      modelFileId: model.id,
      downloadUrl,
      fileType: modelFileType(model.originalFilename),
      settings: built.settings,
      orientation: quote.orientation_mode,
      selection: {
        cost_per_hour:
          Number(rule.machine_time_cost_per_minute) * 60 +
          Number(rule.electricity_cost_per_hour) +
          Number(rule.maintenance_cost_per_hour),
        cost_per_gram: costPerGram,
        // Support costs its filament plus removal labour and surface cleanup.
        support_penalty_per_gram: costPerGram,
      },
    });

    const estimate = slice.estimate;
    // Correct the slicer's numbers by how this printer has really performed. slice_result
    // keeps the raw values; pricing_breakdown.calibration records raw, factor and samples.
    const calibrated = applyCalibration(
      { printTimeSeconds: estimate.print_time_s, filamentGrams: estimate.filament_g },
      calibration,
    );
    const jobOverheadMinutes = printer.job_overhead_minutes ?? DEFAULT_JOB_OVERHEAD_MINUTES;
    const cost = calculateQuoteCost({
      printTimeSeconds: calibrated.printTimeSeconds,
      filamentGrams: calibrated.filamentGrams,
      jobOverheadMinutes,
      quantity: 1,
      materialPricePerGram: material.price_per_gram_cents,
      rule,
      taxRateBps: pricingContext.tax_rate_bps,
      currency: pricingContext.currency,
    });
    const risk = assessSliceRisk({
      printTimeSeconds: calibrated.printTimeSeconds,
      filamentGrams: calibrated.filamentGrams,
      supportGrams: estimate.support_g,
      meshIsWatertight: slice.mesh_is_watertight,
      assumptions: built.assumptions,
    });
    const [sizeX = 0, sizeY = 0, sizeZ = 0] = slice.orientation.size_mm;

    const updated = await this.repo.saveAnalysis(quoteId, tenantId, {
      estimated_weight_grams: Math.round(calibrated.filamentGrams),
      estimated_time_minutes: Math.round(calibrated.printTimeSeconds / 60),
      estimated_volume_mm3: Math.round(slice.mesh_volume_mm3),
      bounding_box_x_mm: sizeX,
      bounding_box_y_mm: sizeY,
      bounding_box_z_mm: sizeZ,
      layer_height_mm: built.settings.process.layer_height_mm,
      infill_percentage: Math.round(built.settings.process.infill_percent),
      technology: 'FDM',
      difficulty_score: risk.difficultyScore,
      risk_percentage: risk.riskPercentage,
      risk_factors: risk.riskFactors,
      material_cost_cents: cost.materialCost,
      machine_time_cost_cents: cost.machineTimeCost,
      electricity_cost_cents: cost.electricityCost,
      maintenance_cost_cents: cost.maintenanceCost,
      post_processing_cost_cents: cost.postProcessingCost,
      failure_risk_cost_cents: cost.failureRiskCost,
      subtotal_cents: cost.subtotal,
      tax_cents: cost.tax,
      total_cents: cost.total,
      currency: cost.currency,
      estimate_source: 'slicer',
      slice_result: { ...slice, settings: built.settings },
      pricing_breakdown: {
        ...cost,
        pricing_rule_id: rule.id,
        printer_profile_id: profile?.id ?? null,
        job_overhead_minutes: jobOverheadMinutes,
        calibration: calibrated.audit,
        assumptions: built.assumptions,
      },
      updated_by: userId,
    });
    if (!updated) {
      throw new NotFoundException(`Quote with ID ${quoteId} not found`);
    }
    return updated;
  }

  private async getUploadedModel(tenantId: string, modelId: string) {
    try {
      const model = await this.modelUploads.getModel(tenantId, modelId);
      if (model.status !== 'uploaded') {
        throw unprocessable('quote.model_not_uploaded', 'The model upload has not completed');
      }
      return model;
    } catch (error) {
      if (error instanceof GeometryDomainError) {
        throw new AppError({
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
        });
      }
      throw error;
    }
  }

  async findById(id: string, tenantId: string): Promise<Quote> {
    const quote = await this.repo.findById(id, tenantId);
    if (!quote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }
    return quote;
  }

  async list(params: QuoteListParams, tenantId: string) {
    return this.repo.list(params, tenantId);
  }

  async update(
    id: string,
    data: Partial<Omit<Quote, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>,
    tenantId: string,
    userId: string,
  ): Promise<Quote> {
    const existing = await this.findById(id, tenantId);

    // A price only stays valid for the settings it was sliced with.
    const pricingInputs = [
      'material_id',
      'printer_id',
      'layer_height_mm',
      'infill_percentage',
    ] as const;
    const pricingInputsChanged = pricingInputs.some((key) => {
      const next = data[key];
      const current = existing[key];
      if (next === undefined) {
        return false;
      }
      // pg returns NUMERIC as strings ("0.200"), so compare numbers by value.
      return typeof next === 'number' ? Number(current) !== next : next !== current;
    });
    if (pricingInputsChanged) {
      if (!EDITABLE_STATUSES.includes(existing.status)) {
        throw new AppError({
          code: 'quote.not_editable',
          message: `A ${existing.status} quote cannot be changed`,
          statusCode: 409,
        });
      }
      data = { ...data, estimate_source: null };
    }

    // Track status change in history
    if (data.status && data.status !== existing.status) {
      await this.repo.addHistory(id, existing.status, data.status, userId, null, tenantId);
    }

    const updated = await this.repo.update(id, { ...data, updated_by: userId }, tenantId);
    if (!updated) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }
    return updated;
  }

  async approve(id: string, tenantId: string, userId: string, notes?: string): Promise<Quote> {
    const quote = await this.findById(id, tenantId);

    if (quote.status !== 'draft' && quote.status !== 'pending') {
      throw new Error(`Quote must be in draft or pending status to approve`);
    }
    if (quote.estimate_source !== 'slicer') {
      throw unprocessable('quote.not_priced', 'Price the quote before approving it');
    }

    return this.update(
      id,
      {
        status: 'approved',
        approved_at: new Date(),
        internal_notes: notes ? `${quote.internal_notes || ''}\n${notes}`.trim() : undefined,
      },
      tenantId,
      userId,
    );
  }

  async reject(id: string, tenantId: string, userId: string, reason: string): Promise<Quote> {
    const quote = await this.findById(id, tenantId);

    if (quote.status !== 'draft' && quote.status !== 'pending') {
      throw new Error(`Quote must be in draft or pending status to reject`);
    }

    return this.update(
      id,
      {
        status: 'rejected',
        rejected_at: new Date(),
        rejection_reason: reason,
      },
      tenantId,
      userId,
    );
  }

  async complete(id: string, tenantId: string, userId: string): Promise<Quote> {
    const quote = await this.findById(id, tenantId);

    if (quote.status !== 'approved') {
      throw new Error(`Quote must be approved to complete`);
    }

    return this.update(id, { status: 'completed', completed_at: new Date() }, tenantId, userId);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const quote = await this.findById(id, tenantId);

    if (quote.status !== 'draft') {
      throw new Error(`Only draft quotes can be deleted`);
    }

    await this.repo.delete(id, tenantId);
  }

  async convertToOrder(quoteId: string, tenantId: string, userId: string | null) {
    const quote = await this.findById(quoteId, tenantId);

    // Check if order already exists for this quote
    const existingOrder = await this.orderService.findByQuoteId(quoteId, tenantId);
    if (existingOrder) {
      return existingOrder;
    }

    // Create order from quote
    const order = await this.orderService.createFromQuote({
      tenantId,
      shop_id: quote.shop_id,
      customer_id: quote.customer_id,
      quote_id: quote.id,
      status: 'accepted',
      subtotal_cents: quote.subtotal_cents ?? 0,
      tax_cents: quote.tax_cents ?? 0,
      total_cents: quote.total_cents ?? 0,
      currency: quote.currency ?? 'USD',
      payment_status: 'pending',
      paid_amount_cents: 0,
      payment_method: null,
      payment_reference: null,
      paid_at: null,
      production_status: 'not_started',
      printer_id: quote.printer_id ?? null,
      started_at: null,
      completed_at: null,
      quality_check_status: null,
      quality_check_notes: null,
      quality_check_at: null,
      delivery_status: 'not_shipped',
      shipping_address: null,
      tracking_number: null,
      shipped_at: null,
      delivered_at: null,
      internal_notes: null,
      customer_notes: quote.internal_notes ?? null,
      cancellation_reason: null,
      created_by: userId,
      updated_by: userId,
    });

    // Update quote status
    await this.update(quoteId, { status: 'approved' }, tenantId, userId ?? 'system');

    // Create order history
    await this.orderService.createHistory(
      order.id,
      {
        old_status: null,
        new_status: 'accepted',
        status_type: 'order',
        changed_by: userId,
        notes: 'Order created from quote',
      },
      tenantId,
    );

    return order;
  }
}
