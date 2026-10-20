import type { Pool, PoolClient } from 'pg';

import { withTenantSession } from '@3d-print-os/persistence';

export class TenancyRepository {
  constructor(private readonly pool: Pool) {}

  withTenant<T>(tenantId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    return withTenantSession(this.pool, { tenantId }, work);
  }

  async getTenant(client: PoolClient, tenantId: string) {
    const result = await client.query<{
      id: string;
      slug: string;
      name: string;
      status: string;
      default_currency: string;
      timezone: string;
      tax_rate_bps: number | null;
    }>(
      `SELECT t.id, t.slug, t.name, t.status, t.default_currency, t.timezone, ts.tax_rate_bps
       FROM tenants t
       LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id
       WHERE t.id = $1`,
      [tenantId],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      status: row.status,
      defaultCurrency: row.default_currency.trim(),
      timezone: row.timezone,
      taxRateBps: row.tax_rate_bps ?? 0,
    };
  }

  async updateTenant(
    client: PoolClient,
    tenantId: string,
    input: { name?: string; timezone?: string; defaultCurrency?: string; taxRateBps?: number },
  ) {
    const updated = await client.query(
      `UPDATE tenants
       SET name = COALESCE($2, name),
           timezone = COALESCE($3, timezone),
           default_currency = COALESCE($4, default_currency),
           updated_at = now()
       WHERE id = $1`,
      [tenantId, input.name ?? null, input.timezone ?? null, input.defaultCurrency ?? null],
    );
    if (!updated.rowCount) {
      return null;
    }
    if (input.taxRateBps !== undefined) {
      // Older tenants may not have a settings row yet.
      await client.query(
        `INSERT INTO tenant_settings (tenant_id, tax_rate_bps)
         VALUES ($1, $2)
         ON CONFLICT (tenant_id) DO UPDATE SET tax_rate_bps = EXCLUDED.tax_rate_bps, updated_at = now()`,
        [tenantId, input.taxRateBps],
      );
    }
    return this.getTenant(client, tenantId);
  }

  async listShops(client: PoolClient, tenantId: string) {
    const result = await client.query<{
      id: string;
      code: string;
      name: string;
      timezone: string | null;
      is_active: boolean;
    }>(
      `SELECT id, code, name, timezone, is_active
       FROM shops
       WHERE tenant_id = $1 AND deleted_at IS NULL
       ORDER BY code`,
      [tenantId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      timezone: row.timezone,
      isActive: row.is_active,
    }));
  }

  async createShop(
    client: PoolClient,
    input: { tenantId: string; code: string; name: string; timezone?: string },
  ) {
    const result = await client.query<{
      id: string;
      code: string;
      name: string;
      timezone: string | null;
      is_active: boolean;
    }>(
      `INSERT INTO shops (tenant_id, code, name, timezone)
       VALUES ($1, upper($2), $3, $4)
       RETURNING id, code, name, timezone, is_active`,
      [input.tenantId, input.code, input.name, input.timezone ?? null],
    );
    const row = result.rows[0]!;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      timezone: row.timezone,
      isActive: row.is_active,
    };
  }

  async getShop(client: PoolClient, tenantId: string, shopId: string) {
    const result = await client.query<{
      id: string;
      code: string;
      name: string;
      timezone: string | null;
      is_active: boolean;
    }>(
      `SELECT id, code, name, timezone, is_active
       FROM shops
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [shopId, tenantId],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      timezone: row.timezone,
      isActive: row.is_active,
    };
  }

  async updateShop(
    client: PoolClient,
    tenantId: string,
    shopId: string,
    input: { name?: string; timezone?: string; isActive?: boolean },
  ) {
    const result = await client.query<{
      id: string;
      code: string;
      name: string;
      timezone: string | null;
      is_active: boolean;
    }>(
      `UPDATE shops
       SET name = COALESCE($3, name),
           timezone = COALESCE($4, timezone),
           is_active = COALESCE($5, is_active),
           updated_at = now()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id, code, name, timezone, is_active`,
      [shopId, tenantId, input.name ?? null, input.timezone ?? null, input.isActive ?? null],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      timezone: row.timezone,
      isActive: row.is_active,
    };
  }
}
