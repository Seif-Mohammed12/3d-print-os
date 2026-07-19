import type { Pool } from 'pg';

import { query, withTenantSession } from '@3d-print-os/persistence';

export type Quote = {
  id: string;
  tenant_id: string;
  shop_id: string;
  customer_id: string;
  model_id: string;
  quote_number: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
  estimated_weight_grams: number;
  estimated_time_minutes: number;
  estimated_volume_mm3: number;
  surface_area_mm2: number;
  bounding_box_x_mm: number | null;
  bounding_box_y_mm: number | null;
  bounding_box_z_mm: number | null;
  material_id: string | null;
  printer_id: string | null;
  technology: string | null;
  layer_height_mm: number | null;
  infill_percentage: number | null;
  difficulty_score: number | null;
  risk_percentage: number | null;
  risk_factors: unknown | null;
  material_cost_cents: number;
  machine_time_cost_cents: number;
  electricity_cost_cents: number;
  maintenance_cost_cents: number;
  post_processing_cost_cents: number;
  failure_risk_cost_cents: number;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  expires_at: Date | null;
  approved_at: Date | null;
  rejected_at: Date | null;
  completed_at: Date | null;
  internal_notes: string | null;
  customer_notes: string | null;
  rejection_reason: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
};

export type QuoteListParams = {
  customerId?: string;
  shopId?: string;
  status?: string;
  page?: number;
  perPage?: number;
};

export class QuoteRepository {
  constructor(private pool: Pool) {}

  async create(data: {
    tenantId: string;
    shop_id: string;
    customer_id: string;
    model_id: string;
  }): Promise<Quote> {
    const result = await withTenantSession(
      this.pool,
      { tenantId: data.tenantId },
      async (client) => {
        // Generate quote number
        const quoteNumberResult = await client.query(
          'SELECT generate_quote_number($1, $2) as quote_number',
          [data.tenantId, data.shop_id],
        );
        const quoteNumber = quoteNumberResult.rows[0]?.quote_number;

        const insertResult = await client.query<Quote>(
          `INSERT INTO quotes (
            tenant_id, shop_id, customer_id, model_id, quote_number, status,
            estimated_weight_grams, estimated_time_minutes, estimated_volume_mm3, surface_area_mm2,
            bounding_box_x_mm, bounding_box_y_mm, bounding_box_z_mm,
            material_id, printer_id, technology, layer_height_mm, infill_percentage,
            difficulty_score, risk_percentage, risk_factors,
            material_cost_cents, machine_time_cost_cents, electricity_cost_cents,
            maintenance_cost_cents, post_processing_cost_cents, failure_risk_cost_cents,
            subtotal_cents, tax_cents, total_cents, currency,
            internal_notes, customer_notes, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)
          RETURNING *`,
          [
            data.tenantId,
            data.shop_id,
            data.customer_id,
            data.model_id,
            quoteNumber,
            'draft',
            0, // estimated_weight_grams
            0, // estimated_time_minutes
            0, // estimated_volume_mm3
            0, // surface_area_mm2
            null, // bounding_box_x_mm
            null, // bounding_box_y_mm
            null, // bounding_box_z_mm
            null, // material_id
            null, // printer_id
            null, // technology
            null, // layer_height_mm
            null, // infill_percentage
            null, // difficulty_score
            null, // risk_percentage
            null, // risk_factors
            0, // material_cost_cents
            0, // machine_time_cost_cents
            0, // electricity_cost_cents
            0, // maintenance_cost_cents
            0, // post_processing_cost_cents
            0, // failure_risk_cost_cents
            0, // subtotal_cents
            0, // tax_cents
            0, // total_cents
            'USD', // currency
            null, // internal_notes
            null, // customer_notes
            null, // created_by
          ],
        );

        return insertResult.rows[0];
      },
    );

    if (!result) {
      throw new Error('Failed to create quote');
    }

    return result;
  }

  async findById(id: string, tenantId: string): Promise<Quote | null> {
    const result = await query<Quote>(
      this.pool,
      'SELECT * FROM quotes WHERE id = $1 AND tenant_id = $2',
      [id, tenantId],
    );

    return result.rows[0] || null;
  }

  async list(
    params: QuoteListParams,
    tenantId: string,
  ): Promise<{
    data: Quote[];
    meta: { total: number; page: number; perPage: number; totalPages: number };
  }> {
    const { customerId, shopId, status, page = 1, perPage = 10 } = params;
    const offset = (page - 1) * perPage;

    const conditions: string[] = ['tenant_id = $1'];
    const queryParams: unknown[] = [tenantId];
    let paramIndex = 2;

    if (customerId) {
      conditions.push(`customer_id = $${paramIndex++}`);
      queryParams.push(customerId);
    }
    if (shopId) {
      conditions.push(`shop_id = $${paramIndex++}`);
      queryParams.push(shopId);
    }
    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      queryParams.push(status);
    }

    const whereClause = conditions.join(' AND ');

    const [dataResult, countResult] = await Promise.all([
      query<Quote>(
        this.pool,
        `SELECT * FROM quotes WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...queryParams, perPage, offset],
      ),
      query<{ count: string }>(
        this.pool,
        `SELECT COUNT(*) as count FROM quotes WHERE ${whereClause}`,
        queryParams,
      ),
    ]);

    const total = parseInt(countResult.rows[0]?.count || '0', 10);
    const totalPages = Math.ceil(total / perPage);

    return {
      data: dataResult.rows,
      meta: { total, page, perPage, totalPages },
    };
  }

  async update(
    id: string,
    data: Partial<Omit<Quote, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>,
    tenantId: string,
  ): Promise<Quote | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.material_id !== undefined) {
      updates.push(`material_id = $${paramIndex++}`);
      values.push(data.material_id);
    }
    if (data.printer_id !== undefined) {
      updates.push(`printer_id = $${paramIndex++}`);
      values.push(data.printer_id);
    }
    if (data.technology !== undefined) {
      updates.push(`technology = $${paramIndex++}`);
      values.push(data.technology);
    }
    if (data.layer_height_mm !== undefined) {
      updates.push(`layer_height_mm = $${paramIndex++}`);
      values.push(data.layer_height_mm);
    }
    if (data.infill_percentage !== undefined) {
      updates.push(`infill_percentage = $${paramIndex++}`);
      values.push(data.infill_percentage);
    }
    if (data.internal_notes !== undefined) {
      updates.push(`internal_notes = $${paramIndex++}`);
      values.push(data.internal_notes);
    }
    if (data.customer_notes !== undefined) {
      updates.push(`customer_notes = $${paramIndex++}`);
      values.push(data.customer_notes);
    }
    if (data.rejection_reason !== undefined) {
      updates.push(`rejection_reason = $${paramIndex++}`);
      values.push(data.rejection_reason);
    }
    if (data.updated_by !== undefined) {
      updates.push(`updated_by = $${paramIndex++}`);
      values.push(data.updated_by);
    }

    if (updates.length === 0) {
      return this.findById(id, tenantId);
    }

    values.push(id, tenantId);

    const result = await query<Quote>(
      this.pool,
      `UPDATE quotes SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++} RETURNING *`,
      values,
    );

    return result.rows[0] || null;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await query(this.pool, 'DELETE FROM quotes WHERE id = $1 AND tenant_id = $2', [
      id,
      tenantId,
    ]);

    return (result.rowCount || 0) > 0;
  }

  async addHistory(
    quoteId: string,
    oldStatus: string | null,
    newStatus: string,
    changedBy: string | null,
    notes: string | null,
    tenantId: string,
  ): Promise<void> {
    await withTenantSession(this.pool, { tenantId }, async (client) => {
      await client.query(
        `INSERT INTO quote_history (quote_id, old_status, new_status, changed_by, notes)
           VALUES ($1, $2, $3, $4, $5)`,
        [quoteId, oldStatus, newStatus, changedBy, notes],
      );
    });
  }
}
