import type { Pool } from 'pg';
import { withTenantSession } from '@3d-print-os/persistence';

export interface Customer {
  id: string;
  tenant_id: string;
  shop_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  customer_type: string;
  business_name: string | null;
  tax_id: string | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerListParams {
  search?: string;
  status?: string;
  customer_type?: string;
  page?: number;
  per_page?: number;
}

export class CustomerRepository {
  constructor(private pool: Pool) {}

  async create(data: {
    tenantId: string;
    shop_id: string;
    name: string;
    email?: string;
    phone?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    customer_type?: string;
    business_name?: string;
    tax_id?: string;
    notes?: string;
    created_by?: string;
    updated_by?: string;
  }): Promise<Customer> {
    const result = await withTenantSession(
      this.pool,
      { tenantId: data.tenantId },
      async (client) => {
        const insertResult = await client.query<Customer>(
          `INSERT INTO customers (
          tenant_id, shop_id, name, email, phone, address_line1, address_line2, city, state, postal_code, country,
          customer_type, business_name, tax_id, notes, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
          [
            data.tenantId,
            data.shop_id,
            data.name,
            data.email ?? null,
            data.phone ?? null,
            data.address_line1 ?? null,
            data.address_line2 ?? null,
            data.city ?? null,
            data.state ?? null,
            data.postal_code ?? null,
            data.country ?? null,
            data.customer_type ?? 'individual',
            data.business_name ?? null,
            data.tax_id ?? null,
            data.notes ?? null,
            data.created_by ?? null,
            data.updated_by ?? null,
          ],
        );

        return insertResult.rows[0];
      },
    );

    if (!result) {
      throw new Error('Failed to create customer');
    }

    return result;
  }

  async findById(id: string, tenantId: string): Promise<Customer | null> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const queryResult = await client.query<Customer>(
        'SELECT * FROM customers WHERE id = $1 AND tenant_id = $2',
        [id, tenantId],
      );

      return queryResult.rows[0] ?? null;
    });

    return result;
  }

  async list(params: CustomerListParams, tenantId: string) {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const conditions: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (params.search) {
        conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
        values.push(`%${params.search}%`);
        paramIndex++;
      }

      if (params.status) {
        conditions.push(`status = $${paramIndex}`);
        values.push(params.status);
        paramIndex++;
      }

      if (params.customer_type) {
        conditions.push(`customer_type = $${paramIndex}`);
        values.push(params.customer_type);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const page = params.page ?? 1;
      const perPage = params.per_page ?? 10;
      const offset = (page - 1) * perPage;

      const countResult = await client.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM customers ${whereClause}`,
        values,
      );

      const total = countResult.rows[0] ? parseInt(countResult.rows[0].count, 10) : 0;

      const dataResult = await client.query<Customer>(
        `SELECT * FROM customers ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
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
    data: Partial<Omit<Customer, 'id' | 'tenant_id' | 'shop_id' | 'created_at' | 'updated_at'>>,
    tenantId: string,
  ): Promise<Customer | null> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        values.push(data.name);
        paramIndex++;
      }
      if (data.email !== undefined) {
        updates.push(`email = $${paramIndex}`);
        values.push(data.email);
        paramIndex++;
      }
      if (data.phone !== undefined) {
        updates.push(`phone = $${paramIndex}`);
        values.push(data.phone);
        paramIndex++;
      }
      if (data.address_line1 !== undefined) {
        updates.push(`address_line1 = $${paramIndex}`);
        values.push(data.address_line1);
        paramIndex++;
      }
      if (data.address_line2 !== undefined) {
        updates.push(`address_line2 = $${paramIndex}`);
        values.push(data.address_line2);
        paramIndex++;
      }
      if (data.city !== undefined) {
        updates.push(`city = $${paramIndex}`);
        values.push(data.city);
        paramIndex++;
      }
      if (data.state !== undefined) {
        updates.push(`state = $${paramIndex}`);
        values.push(data.state);
        paramIndex++;
      }
      if (data.postal_code !== undefined) {
        updates.push(`postal_code = $${paramIndex}`);
        values.push(data.postal_code);
        paramIndex++;
      }
      if (data.country !== undefined) {
        updates.push(`country = $${paramIndex}`);
        values.push(data.country);
        paramIndex++;
      }
      if (data.customer_type !== undefined) {
        updates.push(`customer_type = $${paramIndex}`);
        values.push(data.customer_type);
        paramIndex++;
      }
      if (data.business_name !== undefined) {
        updates.push(`business_name = $${paramIndex}`);
        values.push(data.business_name);
        paramIndex++;
      }
      if (data.tax_id !== undefined) {
        updates.push(`tax_id = $${paramIndex}`);
        values.push(data.tax_id);
        paramIndex++;
      }
      if (data.status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        values.push(data.status);
        paramIndex++;
      }
      if (data.notes !== undefined) {
        updates.push(`notes = $${paramIndex}`);
        values.push(data.notes);
        paramIndex++;
      }
      if (data.updated_by !== undefined) {
        updates.push(`updated_by = $${paramIndex}`);
        values.push(data.updated_by);
        paramIndex++;
      }

      if (updates.length === 0) {
        return null;
      }

      const updateResult = await client.query<Customer>(
        `UPDATE customers SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} RETURNING *`,
        [...values, id, tenantId],
      );

      return updateResult.rows[0] ?? null;
    });

    return result;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await withTenantSession(this.pool, { tenantId }, async (client) => {
      await client.query('DELETE FROM customers WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    });
  }
}
