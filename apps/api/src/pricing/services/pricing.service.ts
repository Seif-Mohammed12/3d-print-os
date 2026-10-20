import { Injectable, NotFoundException } from '@nestjs/common';

import type { PricingRule, PricingRuleListParams } from '../repositories/pricing.repository';
import { PricingRepository } from '../repositories/pricing.repository';

@Injectable()
export class PricingService {
  constructor(private repo: PricingRepository) {}

  async create(data: {
    tenantId: string;
    shop_id?: string;
    material_id?: string;
    printer_id?: string;
    priority?: number;
    material_cost_per_gram?: number;
    material_cost_per_mm3?: number;
    machine_time_cost_per_minute?: number;
    electricity_cost_per_hour?: number;
    maintenance_cost_per_hour?: number;
    failure_risk_percentage?: number;
    post_processing_cost_per_unit?: number;
    post_processing_fixed_cost?: number;
    profit_margin_percentage?: number;
    minimum_price?: number;
    is_active?: boolean;
  }): Promise<PricingRule> {
    return this.repo.create(data);
  }

  async findById(id: string, tenantId: string): Promise<PricingRule> {
    const rule = await this.repo.findById(id, tenantId);
    if (!rule) {
      throw new NotFoundException(`Pricing rule with ID ${id} not found`);
    }
    return rule;
  }

  async findApplicable(
    tenantId: string,
    scope: { shopId: string; materialId: string; printerId: string },
  ): Promise<PricingRule | null> {
    return this.repo.findApplicable(tenantId, scope);
  }

  async list(params: PricingRuleListParams, tenantId: string) {
    return this.repo.list(params, tenantId);
  }

  async update(
    id: string,
    data: Partial<
      Omit<PricingRule, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'deleted_at'>
    >,
    tenantId: string,
  ): Promise<PricingRule> {
    const updated = await this.repo.update(id, data, tenantId);
    if (!updated) {
      throw new NotFoundException(`Pricing rule with ID ${id} not found`);
    }
    return updated;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.findById(id, tenantId);
    await this.repo.delete(id, tenantId);
  }
}
