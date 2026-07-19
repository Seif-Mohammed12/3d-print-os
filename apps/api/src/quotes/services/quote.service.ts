import { Injectable, NotFoundException } from '@nestjs/common';

import type { Quote, QuoteListParams } from '../repositories/quote.repository';
import { QuoteRepository } from '../repositories/quote.repository';
import { GeometryIntegrationService } from './geometry-integration.service';
import { PrintEstimatorService } from './print-estimator.service';
import { CostCalculatorService } from './cost-calculator.service';
import { PricingEngineService } from './pricing-engine.service';
import { OrderService } from '../../orders/services/order.service';

@Injectable()
export class QuoteService {
  constructor(
    private repo: QuoteRepository,
    private geometryService: GeometryIntegrationService,
    private printEstimatorService: PrintEstimatorService,
    private costCalculatorService: CostCalculatorService,
    private pricingEngineService: PricingEngineService,
    private orderService: OrderService,
  ) {}

  async create(data: {
    tenantId: string;
    shop_id: string;
    customer_id: string;
    model_id: string;
  }): Promise<Quote> {
    return this.repo.create(data);
  }

  async analyzeQuote(quoteId: string, tenantId: string): Promise<Quote> {
    const quote = await this.findById(quoteId, tenantId);

    // Trigger geometry analysis
    const analysisId = await this.geometryService.triggerAnalysis(
      quote.model_id,
      tenantId,
      `models/${quote.model_id}/model.stl`,
    );

    // Poll for results (in production, use webhooks or events)
    let analysis = await this.geometryService.getAnalysisResults(analysisId, tenantId);
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout

    while (
      analysis &&
      analysis.status !== 'completed' &&
      analysis.status !== 'failed' &&
      attempts < maxAttempts
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      analysis = await this.geometryService.getAnalysisResults(analysisId, tenantId);
      attempts++;
    }

    if (!analysis || analysis.status === 'failed') {
      throw new Error('Geometry analysis failed');
    }

    // Calculate quote data from analysis
    const quoteData = this.geometryService.calculateQuoteFromAnalysis(analysis);

    // Use new estimation pipeline
    // Step 1: Print estimation
    const printEstimation = this.printEstimatorService.estimatePrint(
      {
        volumeMm3: quoteData.estimated_volume_mm3,
        surfaceAreaMm2: quoteData.surface_area_mm2,
        boundingBox: {
          x: quoteData.bounding_box_x_mm,
          y: quoteData.bounding_box_y_mm,
          z: quoteData.bounding_box_z_mm,
        },
        layerHeightMm: quote.layer_height_mm ?? 0.2,
        infillPercentage: quote.infill_percentage ?? 20,
        nozzleSizeMm: 0.4,
        wallCount: 3,
        printSpeedMmPerS: 60,
        travelSpeedMmPerS: 120,
        accelerationMmPerS2: 1000,
      },
      'PLA',
    );

    // Step 2: Cost calculation
    const costBreakdown = this.costCalculatorService.calculateCost(printEstimation);

    // Step 3: Pricing engine
    const customerPricing = this.pricingEngineService.calculateCustomerPrice(
      costBreakdown,
      printEstimation,
      {
        profitMarginPercentage: 20,
        minimumPriceCents: 500,
        complexityMultiplier: 1.0,
        rushMultiplier: 1.5,
        isRushOrder: false,
      },
    );

    // Update quote with analysis and pricing results
    return this.update(
      quoteId,
      {
        estimated_volume_mm3: quoteData.estimated_volume_mm3,
        surface_area_mm2: quoteData.surface_area_mm2,
        bounding_box_x_mm: quoteData.bounding_box_x_mm,
        bounding_box_y_mm: quoteData.bounding_box_y_mm,
        bounding_box_z_mm: quoteData.bounding_box_z_mm,
        difficulty_score: printEstimation.difficultyScore,
        risk_percentage: printEstimation.riskPercentage,
        risk_factors: printEstimation.riskFactors,
        estimated_time_minutes: printEstimation.time.totalTimeMinutes,
        estimated_weight_grams: printEstimation.material.estimatedWeightGrams,
        material_cost_cents: costBreakdown.materialCostCents,
        machine_time_cost_cents: costBreakdown.machineTimeCostCents,
        electricity_cost_cents: costBreakdown.electricityCostCents,
        maintenance_cost_cents: costBreakdown.maintenanceCostCents,
        post_processing_cost_cents: costBreakdown.postProcessingCostCents,
        failure_risk_cost_cents: costBreakdown.failureRiskCostCents,
        subtotal_cents: customerPricing.subtotalCents,
        tax_cents: customerPricing.taxCents,
        total_cents: customerPricing.totalPriceCents,
        currency: customerPricing.currency,
      },
      tenantId,
      'system',
    );
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
