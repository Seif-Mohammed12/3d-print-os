import type { Pool, PoolClient } from 'pg';

import { withTenantSession } from '@3d-print-os/persistence';

import type { Discount } from '../domain/types';
import type { DiscountsRepository } from '../application/ports';

function mapRow(row: any): Discount {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    shopId: row.shop_id,
    code: row.code,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    maxUses: row.max_uses,
    currentUses: Number(row.current_uses),
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    minimumOrderValue: row.minimum_order_value ? Number(row.minimum_order_value) : null,
    applicableMaterials: row.applicable_materials,
    applicablePrinters: row.applicable_printers,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export class PostgresDiscountsRepository implements DiscountsRepository {
  constructor(private readonly pool: Pool) {}

  withTenant<T>(tenantId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    return withTenantSession(this.pool, { tenantId }, work);
  }

  async findByCode(tenantId: string, code: string): Promise<Discount | null> {
    return this.withTenant(tenantId, async (client) => {
      const result = await client.query(
        `SELECT * FROM pricing_discounts
         WHERE tenant_id = $1 AND code = $2
           AND is_active = true AND deleted_at IS NULL
         LIMIT 1`,
        [tenantId, code]
      );
      const row = result.rows[0];
      return row ? mapRow(row) : null;
    });
  }

  async incrementUsage(id: string, tenantId: string): Promise<void> {
    this.withTenant(tenantId, async (client) => {
      await client.query(
        `UPDATE pricing_discounts
         SET current_uses = current_uses + 1, updated_at = now()
         WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, tenantId]
      );
    });
  }

  async create(discount: Omit<Discount, 'id' | 'createdAt' | 'updatedAt'>): Promise<Discount> {
    return this.withTenant(discount.tenantId, async (client) => {
      const result = await client.query(
        `INSERT INTO pricing_discounts (
            tenant_id, shop_id, code, discount_type, discount_value,
            max_uses, current_uses, valid_from, valid_until,
            minimum_order_value, applicable_materials, applicable_printers, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *`,
        [
          discount.tenantId,
          discount.shopId,
          discount.code,
          discount.discountType,
          discount.discountValue,
          discount.maxUses,
          discount.currentUses,
          discount.validFrom,
          discount.validUntil,
          discount.minimumOrderValue,
          discount.applicableMaterials,
          discount.applicablePrinters,
          discount.isActive,
        ]
      );
      return mapRow(result.rows[0]);
    });
  }

  async update(id: string, tenantId: string, updates: Partial<Discount>): Promise<Discount> {
    return this.withTenant(tenantId, async (client) => {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.code !== undefined) {
        fields.push(`code = $${paramIndex++}`);
        values.push(updates.code);
      }
      if (updates.discountType !== undefined) {
        fields.push(`discount_type = $${paramIndex++}`);
        values.push(updates.discountType);
      }
      if (updates.discountValue !== undefined) {
        fields.push(`discount_value = $${paramIndex++}`);
        values.push(updates.discountValue);
      }
      if (updates.maxUses !== undefined) {
        fields.push(`max_uses = $${paramIndex++}`);
        values.push(updates.maxUses);
      }
      if (updates.validFrom !== undefined) {
        fields.push(`valid_from = $${paramIndex++}`);
        values.push(updates.validFrom);
      }
      if (updates.validUntil !== undefined) {
        fields.push(`valid_until = $${paramIndex++}`);
        values.push(updates.validUntil);
      }
      if (updates.minimumOrderValue !== undefined) {
        fields.push(`minimum_order_value = $${paramIndex++}`);
        values.push(updates.minimumOrderValue);
      }
      if (updates.applicableMaterials !== undefined) {
        fields.push(`applicable_materials = $${paramIndex++}`);
        values.push(updates.applicableMaterials);
      }
      if (updates.applicablePrinters !== undefined) {
        fields.push(`applicable_printers = $${paramIndex++}`);
        values.push(updates.applicablePrinters);
      }
      if (updates.isActive !== undefined) {
        fields.push(`is_active = $${paramIndex++}`);
        values.push(updates.isActive);
      }

      fields.push(`updated_at = now()`);
      values.push(id, tenantId);

      const result = await client.query(
        `UPDATE pricing_discounts SET ${fields.join(', ')}
         WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++} AND deleted_at IS NULL
         RETURNING *`,
        values
      );
      const row = result.rows[0];
      if (!row) {
        throw new Error('Discount not found');
      }
      return mapRow(row);
    });
  }

  async delete(id: string, tenantId: string): Promise<void> {
    this.withTenant(tenantId, async (client) => {
      await client.query(
        `UPDATE pricing_discounts
         SET deleted_at = now(), is_active = false
         WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, tenantId]
      );
    });
  }

  async listByTenant(tenantId: string): Promise<Discount[]> {
    return this.withTenant(tenantId, async (client) => {
      const result = await client.query(
        `SELECT * FROM pricing_discounts
         WHERE tenant_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [tenantId]
      );
      return result.rows.map(mapRow);
    });
  }
}
