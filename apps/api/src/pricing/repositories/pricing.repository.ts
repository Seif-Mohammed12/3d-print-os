import type { Pool } from 'pg';
import { withTenantSession } from '@3d-print-os/persistence';

export interface PricingRule {
  id: string;
  tenant_id: string;
  shop_id: string | null;
  material_id: string | null;
  printer_id: string | null;
  priority: number;
  material_cost_per_gram: number;
  material_cost_per_mm3: number;
  machine_time_cost_per_minute: number;
  electricity_cost_per_hour: number;
  maintenance_cost_per_hour: number;
  failure_risk_percentage: number;
  post_processing_cost_per_unit: number;
  post_processing_fixed_cost: number;
  profit_margin_percentage: number;
  minimum_price: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface PricingRuleListParams {
  shop_id?: string;
  material_id?: string;
  printer_id?: string;
  is_active?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
}

export class PricingRepository {
  constructor(private pool: Pool) {}

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
    const result = await withTenantSession(
      this.pool,
      { tenantId: data.tenantId },
      async (client) => {
        const insertResult = await client.query<PricingRule>(
          `INSERT INTO pricing_rules (
          tenant_id, shop_id, material_id, printer_id, priority, material_cost_per_gram, material_cost_per_mm3, 
          machine_time_cost_per_minute, electricity_cost_per_hour, maintenance_cost_per_hour, failure_risk_percentage,
          post_processing_cost_per_unit, post_processing_fixed_cost, profit_margin_percentage, minimum_price, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
          [
            data.tenantId,
            data.shop_id ?? null,
            data.material_id ?? null,
            data.printer_id ?? null,
            data.priority ?? 0,
            data.material_cost_per_gram ?? 0,
            data.material_cost_per_mm3 ?? 0,
            data.machine_time_cost_per_minute ?? 0,
            data.electricity_cost_per_hour ?? 0,
            data.maintenance_cost_per_hour ?? 0,
            data.failure_risk_percentage ?? 0,
            data.post_processing_cost_per_unit ?? 0,
            data.post_processing_fixed_cost ?? 0,
            data.profit_margin_percentage ?? 20,
            data.minimum_price ?? 0,
            data.is_active ?? true,
          ],
        );

        return insertResult.rows[0];
      },
    );

    if (!result) {
      throw new Error('Failed to create pricing rule');
    }

    return result;
  }

  async findById(id: string, tenantId: string): Promise<PricingRule | null> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const queryResult = await client.query<PricingRule>(
        'SELECT * FROM pricing_rules WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
        [id, tenantId],
      );

      return queryResult.rows[0] ?? null;
    });

    return result;
  }

  async list(params: PricingRuleListParams, tenantId: string) {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const conditions: string[] = ['deleted_at IS NULL'];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (params.shop_id) {
        conditions.push(`shop_id = $${paramIndex}`);
        values.push(params.shop_id);
        paramIndex++;
      }

      if (params.material_id) {
        conditions.push(`material_id = $${paramIndex}`);
        values.push(params.material_id);
        paramIndex++;
      }

      if (params.printer_id) {
        conditions.push(`printer_id = $${paramIndex}`);
        values.push(params.printer_id);
        paramIndex++;
      }

      if (params.is_active !== undefined) {
        conditions.push(`is_active = $${paramIndex}`);
        values.push(params.is_active);
        paramIndex++;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const page = params.page ?? 1;
      const perPage = params.per_page ?? 10;
      const offset = (page - 1) * perPage;

      const countResult = await client.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM pricing_rules ${whereClause}`,
        values,
      );

      const total = countResult.rows[0] ? parseInt(countResult.rows[0].count, 10) : 0;

      const dataResult = await client.query<PricingRule>(
        `SELECT * FROM pricing_rules ${whereClause} ORDER BY priority DESC, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...values, perPage, offset],
      );

      return {
        data: dataResult.rows,
        total,
        page,
        per_page: perPage,
      };
    });

    return result;
  }

  async update(
    id: string,
    data: Partial<Omit<PricingRule, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'deleted_at'>>,
    tenantId: string,
  ): Promise<PricingRule | null> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.shop_id !== undefined) {
        updates.push(`shop_id = $${paramIndex}`);
        values.push(data.shop_id);
        paramIndex++;
      }
      if (data.material_id !== undefined) {
        updates.push(`material_id = $${paramIndex}`);
        values.push(data.material_id);
        paramIndex++;
      }
      if (data.printer_id !== undefined) {
        updates.push(`printer_id = $${paramIndex}`);
        values.push(data.printer_id);
        paramIndex++;
      }
      if (data.priority !== undefined) {
        updates.push(`priority = $${paramIndex}`);
        values.push(data.priority);
        paramIndex++;
      }
      if (data.material_cost_per_gram !== undefined) {
        updates.push(`material_cost_per_gram = $${paramIndex}`);
        values.push(data.material_cost_per_gram);
        paramIndex++;
      }
      if (data.material_cost_per_mm3 !== undefined) {
        updates.push(`material_cost_per_mm3 = $${paramIndex}`);
        values.push(data.material_cost_per_mm3);
        paramIndex++;
      }
      if (data.machine_time_cost_per_minute !== undefined) {
        updates.push(`machine_time_cost_per_minute = $${paramIndex}`);
        values.push(data.machine_time_cost_per_minute);
        paramIndex++;
      }
      if (data.electricity_cost_per_hour !== undefined) {
        updates.push(`electricity_cost_per_hour = $${paramIndex}`);
        values.push(data.electricity_cost_per_hour);
        paramIndex++;
      }
      if (data.maintenance_cost_per_hour !== undefined) {
        updates.push(`maintenance_cost_per_hour = $${paramIndex}`);
        values.push(data.maintenance_cost_per_hour);
        paramIndex++;
      }
      if (data.failure_risk_percentage !== undefined) {
        updates.push(`failure_risk_percentage = $${paramIndex}`);
        values.push(data.failure_risk_percentage);
        paramIndex++;
      }
      if (data.post_processing_cost_per_unit !== undefined) {
        updates.push(`post_processing_cost_per_unit = $${paramIndex}`);
        values.push(data.post_processing_cost_per_unit);
        paramIndex++;
      }
      if (data.post_processing_fixed_cost !== undefined) {
        updates.push(`post_processing_fixed_cost = $${paramIndex}`);
        values.push(data.post_processing_fixed_cost);
        paramIndex++;
      }
      if (data.profit_margin_percentage !== undefined) {
        updates.push(`profit_margin_percentage = $${paramIndex}`);
        values.push(data.profit_margin_percentage);
        paramIndex++;
      }
      if (data.minimum_price !== undefined) {
        updates.push(`minimum_price = $${paramIndex}`);
        values.push(data.minimum_price);
        paramIndex++;
      }
      if (data.is_active !== undefined) {
        updates.push(`is_active = $${paramIndex}`);
        values.push(data.is_active);
        paramIndex++;
      }

      if (updates.length === 0) {
        return null;
      }

      const updateResult = await client.query<PricingRule>(
        `UPDATE pricing_rules SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} AND deleted_at IS NULL RETURNING *`,
        [...values, id, tenantId],
      );

      return updateResult.rows[0] ?? null;
    });

    return result;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await withTenantSession(this.pool, { tenantId }, async (client) => {
      await client.query('UPDATE pricing_rules SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    });
  }
}
