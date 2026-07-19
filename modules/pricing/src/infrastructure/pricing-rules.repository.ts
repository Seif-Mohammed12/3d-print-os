import type { Pool, PoolClient } from 'pg';

import { withTenantSession } from '@3d-print-os/persistence';

import type { PricingRule } from '../domain/types';
import type { PricingRulesRepository } from '../application/ports';

function mapRow(row: any): PricingRule {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    shopId: row.shop_id,
    materialId: row.material_id,
    printerId: row.printer_id,
    priority: row.priority,
    materialCostPerGram: Number(row.material_cost_per_gram),
    materialCostPerMm3: Number(row.material_cost_per_mm3),
    machineTimeCostPerMinute: Number(row.machine_time_cost_per_minute),
    electricityCostPerHour: Number(row.electricity_cost_per_hour),
    maintenanceCostPerHour: Number(row.maintenance_cost_per_hour),
    failureRiskPercentage: Number(row.failure_risk_percentage),
    postProcessingCostPerUnit: Number(row.post_processing_cost_per_unit),
    postProcessingFixedCost: Number(row.post_processing_fixed_cost),
    profitMarginPercentage: Number(row.profit_margin_percentage),
    minimumPrice: Number(row.minimum_price),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export class PostgresPricingRulesRepository implements PricingRulesRepository {
  constructor(private readonly pool: Pool) {}

  withTenant<T>(tenantId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    return withTenantSession(this.pool, { tenantId }, work);
  }

  async findMostSpecific(
    tenantId: string,
    shopId: string | undefined,
    materialId: string | undefined,
    printerId: string | undefined
  ): Promise<PricingRule | null> {
    return this.withTenant(tenantId, async (client) => {
      const result = await client.query(
        `SELECT * FROM pricing_rules
         WHERE tenant_id = $1
           AND ($2::uuid IS NULL OR shop_id = $2)
           AND ($3::uuid IS NULL OR material_id = $3)
           AND ($4::uuid IS NULL OR printer_id = $4)
           AND is_active = true
           AND deleted_at IS NULL
         ORDER BY priority DESC
         LIMIT 1`,
        [tenantId, shopId || null, materialId || null, printerId || null]
      );
      const row = result.rows[0];
      return row ? mapRow(row) : null;
    });
  }

  async findByTenantShopMaterial(
    tenantId: string,
    shopId: string,
    materialId: string
  ): Promise<PricingRule | null> {
    return this.withTenant(tenantId, async (client) => {
      const result = await client.query(
        `SELECT * FROM pricing_rules
         WHERE tenant_id = $1 AND shop_id = $2 AND material_id = $3
           AND is_active = true AND deleted_at IS NULL
         ORDER BY priority DESC
         LIMIT 1`,
        [tenantId, shopId, materialId]
      );
      const row = result.rows[0];
      return row ? mapRow(row) : null;
    });
  }

  async findByTenantShop(tenantId: string, shopId: string): Promise<PricingRule | null> {
    return this.withTenant(tenantId, async (client) => {
      const result = await client.query(
        `SELECT * FROM pricing_rules
         WHERE tenant_id = $1 AND shop_id = $2
           AND is_active = true AND deleted_at IS NULL
         ORDER BY priority DESC
         LIMIT 1`,
        [tenantId, shopId]
      );
      const row = result.rows[0];
      return row ? mapRow(row) : null;
    });
  }

  async findByTenantMaterial(tenantId: string, materialId: string): Promise<PricingRule | null> {
    return this.withTenant(tenantId, async (client) => {
      const result = await client.query(
        `SELECT * FROM pricing_rules
         WHERE tenant_id = $1 AND material_id = $2
           AND is_active = true AND deleted_at IS NULL
         ORDER BY priority DESC
         LIMIT 1`,
        [tenantId, materialId]
      );
      const row = result.rows[0];
      return row ? mapRow(row) : null;
    });
  }

  async findByTenant(tenantId: string): Promise<PricingRule | null> {
    return this.withTenant(tenantId, async (client) => {
      const result = await client.query(
        `SELECT * FROM pricing_rules
         WHERE tenant_id = $1
           AND shop_id IS NULL
           AND material_id IS NULL
           AND printer_id IS NULL
           AND is_active = true
           AND deleted_at IS NULL
         ORDER BY priority DESC
         LIMIT 1`,
        [tenantId]
      );
      const row = result.rows[0];
      return row ? mapRow(row) : null;
    });
  }

  async create(rule: Omit<PricingRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<PricingRule> {
    return this.withTenant(rule.tenantId, async (client) => {
      const result = await client.query(
        `INSERT INTO pricing_rules (
            tenant_id, shop_id, material_id, printer_id, priority,
            material_cost_per_gram, material_cost_per_mm3,
            machine_time_cost_per_minute, electricity_cost_per_hour,
            maintenance_cost_per_hour, failure_risk_percentage,
            post_processing_cost_per_unit, post_processing_fixed_cost,
            profit_margin_percentage, minimum_price, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING *`,
        [
          rule.tenantId,
          rule.shopId,
          rule.materialId,
          rule.printerId,
          rule.priority,
          rule.materialCostPerGram,
          rule.materialCostPerMm3,
          rule.machineTimeCostPerMinute,
          rule.electricityCostPerHour,
          rule.maintenanceCostPerHour,
          rule.failureRiskPercentage,
          rule.postProcessingCostPerUnit,
          rule.postProcessingFixedCost,
          rule.profitMarginPercentage,
          rule.minimumPrice,
          rule.isActive,
        ]
      );
      return mapRow(result.rows[0]);
    });
  }

  async update(id: string, tenantId: string, updates: Partial<PricingRule>): Promise<PricingRule> {
    return this.withTenant(tenantId, async (client) => {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.priority !== undefined) {
        fields.push(`priority = $${paramIndex++}`);
        values.push(updates.priority);
      }
      if (updates.materialCostPerGram !== undefined) {
        fields.push(`material_cost_per_gram = $${paramIndex++}`);
        values.push(updates.materialCostPerGram);
      }
      if (updates.materialCostPerMm3 !== undefined) {
        fields.push(`material_cost_per_mm3 = $${paramIndex++}`);
        values.push(updates.materialCostPerMm3);
      }
      if (updates.machineTimeCostPerMinute !== undefined) {
        fields.push(`machine_time_cost_per_minute = $${paramIndex++}`);
        values.push(updates.machineTimeCostPerMinute);
      }
      if (updates.electricityCostPerHour !== undefined) {
        fields.push(`electricity_cost_per_hour = $${paramIndex++}`);
        values.push(updates.electricityCostPerHour);
      }
      if (updates.maintenanceCostPerHour !== undefined) {
        fields.push(`maintenance_cost_per_hour = $${paramIndex++}`);
        values.push(updates.maintenanceCostPerHour);
      }
      if (updates.failureRiskPercentage !== undefined) {
        fields.push(`failure_risk_percentage = $${paramIndex++}`);
        values.push(updates.failureRiskPercentage);
      }
      if (updates.postProcessingCostPerUnit !== undefined) {
        fields.push(`post_processing_cost_per_unit = $${paramIndex++}`);
        values.push(updates.postProcessingCostPerUnit);
      }
      if (updates.postProcessingFixedCost !== undefined) {
        fields.push(`post_processing_fixed_cost = $${paramIndex++}`);
        values.push(updates.postProcessingFixedCost);
      }
      if (updates.profitMarginPercentage !== undefined) {
        fields.push(`profit_margin_percentage = $${paramIndex++}`);
        values.push(updates.profitMarginPercentage);
      }
      if (updates.minimumPrice !== undefined) {
        fields.push(`minimum_price = $${paramIndex++}`);
        values.push(updates.minimumPrice);
      }
      if (updates.isActive !== undefined) {
        fields.push(`is_active = $${paramIndex++}`);
        values.push(updates.isActive);
      }

      fields.push(`updated_at = now()`);
      values.push(id, tenantId);

      const result = await client.query(
        `UPDATE pricing_rules SET ${fields.join(', ')}
         WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++} AND deleted_at IS NULL
         RETURNING *`,
        values
      );
      const row = result.rows[0];
      if (!row) {
        throw new Error('Pricing rule not found');
      }
      return mapRow(row);
    });
  }

  async delete(id: string, tenantId: string): Promise<void> {
    this.withTenant(tenantId, async (client) => {
      await client.query(
        `UPDATE pricing_rules
         SET deleted_at = now(), is_active = false
         WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, tenantId]
      );
    });
  }

  async listByTenant(tenantId: string): Promise<PricingRule[]> {
    return this.withTenant(tenantId, async (client) => {
      const result = await client.query(
        `SELECT * FROM pricing_rules
         WHERE tenant_id = $1 AND deleted_at IS NULL
         ORDER BY priority DESC, created_at DESC`,
        [tenantId]
      );
      return result.rows.map(mapRow);
    });
  }
}
