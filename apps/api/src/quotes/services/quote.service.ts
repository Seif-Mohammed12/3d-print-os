import { Injectable, NotFoundException } from '@nestjs/common';

import type { Quote, QuoteListParams } from '../repositories/quote.repository';
import { QuoteRepository } from '../repositories/quote.repository';
import { GeometryIntegrationService } from './geometry-integration.service';
import { PricingIntegrationService } from './pricing-integration.service';

@Injectable()
export class QuoteService {
  constructor(
    private repo: QuoteRepository,
    private geometryService: GeometryIntegrationService,
    private pricingService: PricingIntegrationService,
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

    // Calculate estimated time
    const estimatedTimeMinutes = this.pricingService.calculateEstimatedTime(
      quoteData.estimated_volume_mm3,
      quote.layer_height_mm ?? 0.2,
      quote.infill_percentage ?? 20,
    );

    // Calculate pricing
    const pricing = this.pricingService.calculatePrice(
      quoteData.estimated_volume_mm3,
      estimatedTimeMinutes,
      quote.material_id ?? undefined,
      quote.printer_id ?? undefined,
      quoteData.risk_percentage,
      quoteData.difficulty_score,
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
        difficulty_score: quoteData.difficulty_score,
        risk_percentage: quoteData.risk_percentage,
        risk_factors: quoteData.risk_factors,
        estimated_time_minutes: estimatedTimeMinutes,
        estimated_weight_grams: Math.round((quoteData.estimated_volume_mm3 / 1000) * 1.24), // Default PLA density
        material_cost_cents: pricing.material_cost_cents,
        machine_time_cost_cents: pricing.machine_time_cost_cents,
        electricity_cost_cents: pricing.electricity_cost_cents,
        maintenance_cost_cents: pricing.maintenance_cost_cents,
        post_processing_cost_cents: pricing.post_processing_cost_cents,
        failure_risk_cost_cents: pricing.failure_risk_cost_cents,
        subtotal_cents: pricing.subtotal_cents,
        tax_cents: pricing.tax_cents,
        total_cents: pricing.total_cents,
        currency: pricing.currency,
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
}
