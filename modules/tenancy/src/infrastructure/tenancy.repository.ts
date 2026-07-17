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
    }>(
      `SELECT id, slug, name, status, default_currency, timezone
       FROM tenants WHERE id = $1`,
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
      defaultCurrency: row.default_currency,
      timezone: row.timezone,
    };
  }

  async updateTenant(
    client: PoolClient,
    tenantId: string,
    input: { name?: string; timezone?: string; defaultCurrency?: string },
  ) {
    const result = await client.query<{
      id: string;
      slug: string;
      name: string;
      status: string;
      default_currency: string;
      timezone: string;
    }>(
      `UPDATE tenants
       SET name = COALESCE($2, name),
           timezone = COALESCE($3, timezone),
           default_currency = COALESCE($4, default_currency),
           updated_at = now()
       WHERE id = $1
       RETURNING id, slug, name, status, default_currency, timezone`,
      [tenantId, input.name ?? null, input.timezone ?? null, input.defaultCurrency ?? null],
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
      defaultCurrency: row.default_currency,
      timezone: row.timezone,
    };
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
