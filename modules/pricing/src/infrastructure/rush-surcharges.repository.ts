import type { Pool, PoolClient } from 'pg';

import { withTenantSession } from '@3d-print-os/persistence';

import type { RushSurcharge } from '../domain/types';
import type { RushSurchargesRepository } from '../application/ports';

function mapRow(row: any): RushSurcharge {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    shopId: row.shop_id,
    tierName: row.tier_name,
    hoursBeforeDeadline: Number(row.hours_before_deadline),
    surchargeType: row.surcharge_type,
    surchargeValue: Number(row.surcharge_value),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export class PostgresRushSurchargesRepository implements RushSurchargesRepository {
  constructor(private readonly pool: Pool) {}

  withTenant<T>(tenantId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    return withTenantSession(this.pool, { tenantId }, work);
  }

  async findByDeadline(
    tenantId: string,
    shopId: string | undefined,
    hoursBeforeDeadline: number
  ): Promise<RushSurcharge | null> {
    return this.withTenant(tenantId, async (client) => {
      const result = await client.query(
        `SELECT * FROM pricing_rush_surcharges
         WHERE tenant_id = $1
           AND ($2::uuid IS NULL OR shop_id = $2)
           AND hours_before_deadline >= $3
           AND is_active = true
           AND deleted_at IS NULL
         ORDER BY hours_before_deadline ASC
         LIMIT 1`,
        [tenantId, shopId || null, hoursBeforeDeadline]
      );
      const row = result.rows[0];
      return row ? mapRow(row) : null;
    });
  }

  async create(surcharge: Omit<RushSurcharge, 'id' | 'createdAt' | 'updatedAt'>): Promise<RushSurcharge> {
    return this.withTenant(surcharge.tenantId, async (client) => {
      const result = await client.query(
        `INSERT INTO pricing_rush_surcharges (
            tenant_id, shop_id, tier_name, hours_before_deadline,
            surcharge_type, surcharge_value, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
        [
          surcharge.tenantId,
          surcharge.shopId,
          surcharge.tierName,
          surcharge.hoursBeforeDeadline,
          surcharge.surchargeType,
          surcharge.surchargeValue,
          surcharge.isActive,
        ]
      );
      return mapRow(result.rows[0]);
    });
  }

  async update(id: string, tenantId: string, updates: Partial<RushSurcharge>): Promise<RushSurcharge> {
    return this.withTenant(tenantId, async (client) => {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.tierName !== undefined) {
        fields.push(`tier_name = $${paramIndex++}`);
        values.push(updates.tierName);
      }
      if (updates.hoursBeforeDeadline !== undefined) {
        fields.push(`hours_before_deadline = $${paramIndex++}`);
        values.push(updates.hoursBeforeDeadline);
      }
      if (updates.surchargeType !== undefined) {
        fields.push(`surcharge_type = $${paramIndex++}`);
        values.push(updates.surchargeType);
      }
      if (updates.surchargeValue !== undefined) {
        fields.push(`surcharge_value = $${paramIndex++}`);
        values.push(updates.surchargeValue);
      }
      if (updates.isActive !== undefined) {
        fields.push(`is_active = $${paramIndex++}`);
        values.push(updates.isActive);
      }

      fields.push(`updated_at = now()`);
      values.push(id, tenantId);

      const result = await client.query(
        `UPDATE pricing_rush_surcharges SET ${fields.join(', ')}
         WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++} AND deleted_at IS NULL
         RETURNING *`,
        values
      );
      const row = result.rows[0];
      if (!row) {
        throw new Error('Rush surcharge not found');
      }
      return mapRow(row);
    });
  }

  async delete(id: string, tenantId: string): Promise<void> {
    this.withTenant(tenantId, async (client) => {
      await client.query(
        `UPDATE pricing_rush_surcharges
         SET deleted_at = now(), is_active = false
         WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, tenantId]
      );
    });
  }

  async listByTenant(tenantId: string): Promise<RushSurcharge[]> {
    return this.withTenant(tenantId, async (client) => {
      const result = await client.query(
        `SELECT * FROM pricing_rush_surcharges
         WHERE tenant_id = $1 AND deleted_at IS NULL
         ORDER BY hours_before_deadline ASC`,
        [tenantId]
      );
      return result.rows.map(mapRow);
    });
  }
}
