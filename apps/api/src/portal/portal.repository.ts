import type { Pool, PoolClient } from 'pg';

import { query, withTenantSession } from '@3d-print-os/persistence';

import type { PortalOrderRow, PortalQuoteRow } from './domain/portal-quote';

export type PortalCustomer = { id: string; crmCustomerId: string | null };

export type PortalPrinter = {
  id: string;
  shop_id: string;
  name: string;
  nozzle_diameter_mm: string | number | null;
  build_volume_x_mm: string | number | null;
  build_volume_y_mm: string | number | null;
  build_volume_z_mm: string | number | null;
};

export type PortalMaterial = {
  id: string;
  name: string;
  material_type: string;
  color: string | null;
  color_code: string | null;
};

export type QuotingSetup = {
  /** The printer the shop picked, or null to use the fallback. */
  configuredPrinterId: string | null;
  printer: PortalPrinter | null;
  currency: string;
  quoteValidityHours: number;
};

const PRINTER_COLUMNS = `p.id, p.shop_id, p.name, p.nozzle_diameter_mm,
  p.build_volume_x_mm, p.build_volume_y_mm, p.build_volume_z_mm`;

/** Quotable: an active FDM printer (the slicer pipeline is FDM only). */
const QUOTABLE_PRINTER = `p.technology = 'FDM' AND p.status = 'active'`;

/**
 * Customer-safe columns only. Never add cost lines, pricing_breakdown, slice_result,
 * internal_notes or risk fields here: this select is what the portal can expose.
 */
const QUOTE_SELECT = `SELECT q.id, q.quote_number, q.status, q.estimate_source, q.total_cents,
    q.currency, q.quantity, q.print_quality, q.estimated_time_minutes, q.estimated_weight_grams,
    q.bounding_box_x_mm, q.bounding_box_y_mm, q.bounding_box_z_mm, q.customer_notes,
    q.expires_at, q.created_at,
    mf.original_filename AS model_filename,
    m.id AS material_id, m.name AS material_name, m.material_type,
    m.color AS material_color, m.color_code AS material_color_code,
    o.id AS order_id, o.order_number
  FROM quotes q
  LEFT JOIN model_files mf ON mf.id = q.model_id AND mf.tenant_id = q.tenant_id
  LEFT JOIN materials m ON m.id = q.material_id AND m.tenant_id = q.tenant_id
  LEFT JOIN LATERAL (
    SELECT id, order_number FROM orders
    WHERE quote_id = q.id AND tenant_id = q.tenant_id
    ORDER BY created_at LIMIT 1
  ) o ON true`;

/** Portal quotes of one CRM customer. $1 = tenant, $2 = CRM customer. */
const OWN_QUOTES = `q.tenant_id = $1 AND q.customer_id = $2 AND q.source = 'portal'`;

const UNIQUE_VIOLATION = '23505';

export class PortalRepository {
  constructor(private readonly pool: Pool) {}

  async findPortalCustomer(tenantId: string, userId: string): Promise<PortalCustomer | null> {
    const result = await query<{ id: string; crm_customer_id: string | null }>(
      this.pool,
      `SELECT id, crm_customer_id FROM portal_customers WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId],
    );
    const row = result.rows[0];
    return row ? { id: row.id, crmCustomerId: row.crm_customer_id } : null;
  }

  /**
   * The CRM customer that this portal account's quotes and orders reference, created on the
   * first quote. Each portal account gets its own CRM row; it is never matched to an
   * existing customer by email because sign-up does not verify email ownership.
   */
  async ensureCrmCustomer(
    tenantId: string,
    userId: string,
    shopId: string,
  ): Promise<string | null> {
    return withTenantSession(this.pool, { tenantId }, async (client) => {
      const result = await client.query<{
        id: string;
        crm_customer_id: string | null;
        phone: string | null;
        company_name: string | null;
        email: string;
        full_name: string;
      }>(
        `SELECT pc.id, pc.crm_customer_id, pc.phone, pc.company_name, u.email, u.full_name
         FROM portal_customers pc
         INNER JOIN users u ON u.id = pc.user_id
         WHERE pc.tenant_id = $1 AND pc.user_id = $2
         FOR UPDATE OF pc`,
        [tenantId, userId],
      );
      const portal = result.rows[0];
      if (!portal) {
        return null;
      }
      if (portal.crm_customer_id) {
        const linked = await client.query(
          `SELECT 1 FROM customers WHERE id = $1 AND tenant_id = $2`,
          [portal.crm_customer_id, tenantId],
        );
        if ((linked.rowCount ?? 0) > 0) {
          return portal.crm_customer_id;
        }
      }

      const crmCustomerId = await this.insertCrmCustomer(client, tenantId, shopId, userId, portal);
      await client.query(
        `UPDATE portal_customers SET crm_customer_id = $1, updated_at = now()
         WHERE id = $2 AND tenant_id = $3`,
        [crmCustomerId, portal.id, tenantId],
      );
      return crmCustomerId;
    });
  }

  private async insertCrmCustomer(
    client: PoolClient,
    tenantId: string,
    shopId: string,
    userId: string,
    portal: { phone: string | null; company_name: string | null; email: string; full_name: string },
  ): Promise<string> {
    const insert = (email: string | null, notes: string) =>
      client.query<{ id: string }>(
        `INSERT INTO customers (
           tenant_id, shop_id, name, email, phone, customer_type, business_name, notes,
           created_by, updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
         RETURNING id`,
        [
          tenantId,
          shopId,
          portal.full_name,
          email,
          portal.phone,
          portal.company_name ? 'business' : 'individual',
          portal.company_name,
          notes,
          userId,
        ],
      );

    // customers.email is unique across all tenants, so another record may already hold it.
    await client.query('SAVEPOINT portal_crm_customer');
    try {
      const created = await insert(portal.email, 'Created from the customer portal.');
      await client.query('RELEASE SAVEPOINT portal_crm_customer');
      return created.rows[0]!.id;
    } catch (error) {
      if ((error as { code?: string }).code !== UNIQUE_VIOLATION) {
        throw error;
      }
      await client.query('ROLLBACK TO SAVEPOINT portal_crm_customer');
      const created = await insert(
        null,
        `Created from the customer portal. Portal account email ${portal.email} is already ` +
          'on another customer record; merge them if they are the same person.',
      );
      return created.rows[0]!.id;
    }
  }

  async getQuotingSetup(tenantId: string): Promise<QuotingSetup> {
    const settings = await query<{
      currency: string;
      quote_validity_hours: number | null;
      portal_printer_id: string | null;
    }>(
      this.pool,
      `SELECT t.default_currency AS currency, ts.quote_validity_hours, ts.portal_printer_id
       FROM tenants t
       LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id
       WHERE t.id = $1`,
      [tenantId],
    );
    const row = settings.rows[0];
    if (!row) {
      throw new Error('Tenant not found');
    }

    // The shop's pick when it is still quotable, else the oldest active FDM printer.
    const printer = await query<PortalPrinter>(
      this.pool,
      `SELECT ${PRINTER_COLUMNS}
       FROM printers p
       WHERE p.tenant_id = $1 AND ${QUOTABLE_PRINTER}
       ORDER BY (p.id = $2) DESC, p.created_at, p.id
       LIMIT 1`,
      [tenantId, row.portal_printer_id],
    );

    return {
      configuredPrinterId: row.portal_printer_id,
      printer: printer.rows[0] ?? null,
      currency: row.currency.trim(),
      quoteValidityHours: row.quote_validity_hours ?? 72,
    };
  }

  async findQuotablePrinter(tenantId: string, printerId: string): Promise<PortalPrinter | null> {
    const result = await query<PortalPrinter>(
      this.pool,
      `SELECT ${PRINTER_COLUMNS} FROM printers p
       WHERE p.tenant_id = $1 AND p.id = $2 AND ${QUOTABLE_PRINTER}`,
      [tenantId, printerId],
    );
    return result.rows[0] ?? null;
  }

  async setPortalPrinter(tenantId: string, printerId: string | null): Promise<void> {
    await query(
      this.pool,
      `INSERT INTO tenant_settings (tenant_id, portal_printer_id)
       VALUES ($1, $2)
       ON CONFLICT (tenant_id) DO UPDATE
         SET portal_printer_id = EXCLUDED.portal_printer_id, updated_at = now()`,
      [tenantId, printerId],
    );
  }

  /** Active materials, minus any the shop marked incompatible with the portal printer. */
  async listMaterials(tenantId: string, printerId: string): Promise<PortalMaterial[]> {
    const result = await query<PortalMaterial>(
      this.pool,
      `SELECT m.id, m.name, m.material_type, m.color, m.color_code
       FROM materials m
       WHERE m.tenant_id = $1 AND m.is_active = true
         AND NOT EXISTS (
           SELECT 1 FROM material_printer_compatibility c
           WHERE c.material_id = m.id AND c.printer_id = $2 AND c.is_compatible = false
         )
       ORDER BY m.material_type, m.name, m.color`,
      [tenantId, printerId],
    );
    return result.rows;
  }

  async findMaterial(
    tenantId: string,
    printerId: string,
    materialId: string,
  ): Promise<PortalMaterial | null> {
    const materials = await this.listMaterials(tenantId, printerId);
    return materials.find((material) => material.id === materialId) ?? null;
  }

  /** A model this user uploaded, in this tenant. */
  async findOwnModel(
    tenantId: string,
    userId: string,
    modelId: string,
  ): Promise<{ id: string; status: string } | null> {
    const result = await query<{ id: string; status: string }>(
      this.pool,
      `SELECT id, status FROM model_files
       WHERE tenant_id = $1 AND id = $2 AND uploaded_by_user_id = $3 AND deleted_at IS NULL`,
      [tenantId, modelId, userId],
    );
    return result.rows[0] ?? null;
  }

  async listQuotes(tenantId: string, crmCustomerId: string): Promise<PortalQuoteRow[]> {
    const result = await query<PortalQuoteRow>(
      this.pool,
      `${QUOTE_SELECT} WHERE ${OWN_QUOTES} ORDER BY q.created_at DESC LIMIT 200`,
      [tenantId, crmCustomerId],
    );
    return result.rows;
  }

  async findQuote(
    tenantId: string,
    crmCustomerId: string,
    quoteId: string,
  ): Promise<PortalQuoteRow | null> {
    const result = await query<PortalQuoteRow>(
      this.pool,
      `${QUOTE_SELECT} WHERE ${OWN_QUOTES} AND q.id = $3`,
      [tenantId, crmCustomerId, quoteId],
    );
    return result.rows[0] ?? null;
  }

  /**
   * Atomically move a priced, unexpired portal quote to approved, provided its price is
   * still the one the customer saw. Returns false when any condition no longer holds.
   */
  async claimForOrder(
    tenantId: string,
    crmCustomerId: string,
    quoteId: string,
    expectedTotalCents: number,
    userId: string,
  ): Promise<boolean> {
    return withTenantSession(this.pool, { tenantId }, async (client) => {
      const claimed = await client.query(
        `UPDATE quotes q SET status = 'approved', approved_at = now(), updated_by = $5
         WHERE ${OWN_QUOTES} AND q.id = $3
           AND q.status = 'pending' AND q.estimate_source = 'slicer'
           AND q.total_cents = $4
           AND (q.expires_at IS NULL OR q.expires_at > now())`,
        [tenantId, crmCustomerId, quoteId, expectedTotalCents, userId],
      );
      if ((claimed.rowCount ?? 0) === 0) {
        return false;
      }
      await client.query(
        `INSERT INTO quote_history (quote_id, old_status, new_status, changed_by, notes)
         VALUES ($1, 'pending', 'approved', $2, 'Accepted by the customer in the portal')`,
        [quoteId, userId],
      );
      return true;
    });
  }

  async listOrders(tenantId: string, crmCustomerId: string): Promise<PortalOrderRow[]> {
    const result = await query<PortalOrderRow>(
      this.pool,
      `SELECT o.id, o.order_number, o.status, o.production_status, o.delivery_status,
         o.total_cents, o.currency, o.tracking_number, o.created_at, o.completed_at,
         o.delivered_at, o.quote_id, q.quote_number, q.quantity,
         mf.original_filename AS model_filename
       FROM orders o
       LEFT JOIN quotes q ON q.id = o.quote_id AND q.tenant_id = o.tenant_id
       LEFT JOIN model_files mf ON mf.id = q.model_id AND mf.tenant_id = o.tenant_id
       WHERE o.tenant_id = $1 AND o.customer_id = $2
       ORDER BY o.created_at DESC
       LIMIT 200`,
      [tenantId, crmCustomerId],
    );
    return result.rows;
  }
}
