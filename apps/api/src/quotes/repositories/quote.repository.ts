import type { Pool } from 'pg';

import { query, withTenantSession } from '@3d-print-os/persistence';

import { assertTenantReferences } from '../../shared/tenant-references';
import type { OrientationMode, SupportsMode } from '../domain/slice-settings';

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
  supports_mode: SupportsMode;
  orientation_mode: OrientationMode;
  estimate_source: 'slicer' | null;
  slice_result: unknown | null;
  pricing_breakdown: unknown | null;
  analyzed_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
};

export type CreateQuoteData = {
  tenantId: string;
  shop_id: string;
  customer_id: string;
  model_id: string;
  material_id?: string | null;
  printer_id?: string | null;
  technology?: string | null;
  layer_height_mm?: number | null;
  infill_percentage?: number | null;
  supports_mode?: SupportsMode;
  orientation_mode?: OrientationMode;
  internal_notes?: string | null;
  customer_notes?: string | null;
  created_by?: string | null;
};

export type QuoteAnalysis = {
  estimated_weight_grams: number;
  estimated_time_minutes: number;
  estimated_volume_mm3: number;
  bounding_box_x_mm: number;
  bounding_box_y_mm: number;
  bounding_box_z_mm: number;
  layer_height_mm: number;
  infill_percentage: number;
  technology: string;
  difficulty_score: number;
  risk_percentage: number;
  risk_factors: Array<{ factor: string; severity: string; description: string }>;
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
  estimate_source: 'slicer';
  slice_result: unknown;
  pricing_breakdown: unknown;
  updated_by: string | null;
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

  async create(data: CreateQuoteData): Promise<Quote> {
    const result = await withTenantSession(
      this.pool,
      { tenantId: data.tenantId },
      async (client) => {
        await assertTenantReferences(client, data.tenantId, [
          { table: 'shops', id: data.shop_id, field: 'shopId' },
          { table: 'customers', id: data.customer_id, field: 'customerId' },
          { table: 'model_files', id: data.model_id, field: 'modelId' },
          { table: 'materials', id: data.material_id, field: 'materialId' },
          { table: 'printers', id: data.printer_id, field: 'printerId' },
        ]);
        const quoteNumberResult = await client.query<{ quote_number: string }>(
          'SELECT generate_quote_number($1, $2) as quote_number',
          [data.tenantId, data.shop_id],
        );
        const quoteNumber = quoteNumberResult.rows[0]?.quote_number;

        // Money columns default to 0 until the quote is analyzed; currency comes from the tenant.
        const insertResult = await client.query<Quote>(
          `INSERT INTO quotes (
            tenant_id, shop_id, customer_id, model_id, quote_number, status,
            material_id, printer_id, technology, layer_height_mm, infill_percentage,
            supports_mode, orientation_mode, internal_notes, customer_notes, created_by, currency
          ) VALUES (
            $1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            (SELECT default_currency FROM tenants WHERE id = $1)
          )
          RETURNING *`,
          [
            data.tenantId,
            data.shop_id,
            data.customer_id,
            data.model_id,
            quoteNumber,
            data.material_id ?? null,
            data.printer_id ?? null,
            data.technology ?? null,
            data.layer_height_mm ?? null,
            data.infill_percentage ?? null,
            data.supports_mode ?? 'auto',
            data.orientation_mode ?? 'auto',
            data.internal_notes ?? null,
            data.customer_notes ?? null,
            data.created_by ?? null,
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

  /** Persist the slicer estimate and the resulting price in one statement. */
  async saveAnalysis(id: string, tenantId: string, data: QuoteAnalysis): Promise<Quote | null> {
    const result = await query<Quote>(
      this.pool,
      `UPDATE quotes SET
         estimated_weight_grams = $1,
         estimated_time_minutes = $2,
         estimated_volume_mm3 = $3,
         bounding_box_x_mm = $4,
         bounding_box_y_mm = $5,
         bounding_box_z_mm = $6,
         layer_height_mm = $7,
         infill_percentage = $8,
         technology = $9,
         difficulty_score = $10,
         risk_percentage = $11,
         risk_factors = $12,
         material_cost_cents = $13,
         machine_time_cost_cents = $14,
         electricity_cost_cents = $15,
         maintenance_cost_cents = $16,
         post_processing_cost_cents = $17,
         failure_risk_cost_cents = $18,
         subtotal_cents = $19,
         tax_cents = $20,
         total_cents = $21,
         currency = $22,
         estimate_source = $23,
         slice_result = $24,
         pricing_breakdown = $25,
         analyzed_at = now(),
         updated_by = $26
       WHERE id = $27 AND tenant_id = $28
       RETURNING *`,
      [
        data.estimated_weight_grams,
        data.estimated_time_minutes,
        data.estimated_volume_mm3,
        data.bounding_box_x_mm,
        data.bounding_box_y_mm,
        data.bounding_box_z_mm,
        data.layer_height_mm,
        data.infill_percentage,
        data.technology,
        data.difficulty_score,
        data.risk_percentage,
        JSON.stringify(data.risk_factors),
        data.material_cost_cents,
        data.machine_time_cost_cents,
        data.electricity_cost_cents,
        data.maintenance_cost_cents,
        data.post_processing_cost_cents,
        data.failure_risk_cost_cents,
        data.subtotal_cents,
        data.tax_cents,
        data.total_cents,
        data.currency,
        data.estimate_source,
        JSON.stringify(data.slice_result),
        JSON.stringify(data.pricing_breakdown),
        data.updated_by,
        id,
        tenantId,
      ],
    );

    return result.rows[0] || null;
  }

  async getPricingContext(tenantId: string): Promise<{ currency: string; tax_rate_bps: number }> {
    const result = await query<{ currency: string; tax_rate_bps: number | null }>(
      this.pool,
      `SELECT t.default_currency AS currency, ts.tax_rate_bps
       FROM tenants t
       LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id
       WHERE t.id = $1`,
      [tenantId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error('Tenant not found');
    }
    return { currency: row.currency.trim(), tax_rate_bps: row.tax_rate_bps ?? 0 };
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
    if (data.estimate_source !== undefined) {
      updates.push(`estimate_source = $${paramIndex++}`);
      values.push(data.estimate_source);
    }
    if (data.updated_by !== undefined) {
      updates.push(`updated_by = $${paramIndex++}`);
      values.push(data.updated_by);
    }

    if (updates.length === 0) {
      return this.findById(id, tenantId);
    }

    await assertTenantReferences(this.pool, tenantId, [
      { table: 'materials', id: data.material_id, field: 'materialId' },
      { table: 'printers', id: data.printer_id, field: 'printerId' },
    ]);

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
      // quote_history has no tenant_id; only write it for a quote this tenant owns.
      const owned = await client.query('SELECT 1 FROM quotes WHERE id = $1 AND tenant_id = $2', [
        quoteId,
        tenantId,
      ]);
      if ((owned.rowCount ?? 0) === 0) {
        return;
      }
      await client.query(
        `INSERT INTO quote_history (quote_id, old_status, new_status, changed_by, notes)
           VALUES ($1, $2, $3, $4, $5)`,
        [quoteId, oldStatus, newStatus, changedBy, notes],
      );
    });
  }
}
