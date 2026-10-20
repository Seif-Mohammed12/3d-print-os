import type { Pool, PoolClient } from 'pg';
import { withTenantSession } from '@3d-print-os/persistence';

import { assertTenantReferences } from '../../shared/tenant-references';

export interface Order {
  id: string;
  tenant_id: string;
  shop_id: string;
  customer_id: string;
  /** Present on findById/list results only. */
  customer_name?: string | null;
  quote_id: string;
  order_number: string;
  status: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  payment_status: string;
  paid_amount_cents: number;
  payment_method: string | null;
  payment_reference: string | null;
  paid_at: Date | null;
  production_status: string;
  printer_id: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  quality_check_status: string | null;
  quality_check_notes: string | null;
  quality_check_at: Date | null;
  delivery_status: string;
  shipping_address: unknown;
  tracking_number: string | null;
  shipped_at: Date | null;
  delivered_at: Date | null;
  internal_notes: string | null;
  customer_notes: string | null;
  cancellation_reason: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrderHistory {
  id: string;
  order_id: string;
  old_status: string | null;
  new_status: string;
  status_type: string;
  changed_by: string | null;
  changed_at: Date;
  notes: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_name: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  production_status: string;
  printer_id: string | null;
  created_at: Date;
}

export interface OrderListParams {
  shopId?: string;
  customerId?: string;
  status?: string;
  paymentStatus?: string;
  productionStatus?: string;
  deliveryStatus?: string;
  search?: string;
  page?: number;
  perPage?: number;
}

/**
 * Order history and items have no tenant_id; they are scoped through their order.
 * `tenantParam` is the placeholder index holding the tenant id.
 */
function orderInTenant(tenantParam: number): string {
  return `order_id IN (SELECT id FROM orders WHERE tenant_id = $${tenantParam})`;
}

async function orderBelongsToTenant(
  client: PoolClient,
  orderId: string,
  tenantId: string,
): Promise<boolean> {
  const result = await client.query('SELECT 1 FROM orders WHERE id = $1 AND tenant_id = $2', [
    orderId,
    tenantId,
  ]);
  return (result.rowCount ?? 0) > 0;
}

export class OrderRepository {
  constructor(private pool: Pool) {}

  async createFromQuote(
    data: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'tenant_id' | 'order_number'> & {
      tenantId: string;
    },
  ): Promise<Order> {
    const result = await withTenantSession(
      this.pool,
      { tenantId: data.tenantId },
      async (client) => {
        await assertTenantReferences(client, data.tenantId, [
          { table: 'shops', id: data.shop_id, field: 'shopId' },
          { table: 'customers', id: data.customer_id, field: 'customerId' },
          { table: 'quotes', id: data.quote_id, field: 'quoteId' },
          { table: 'printers', id: data.printer_id, field: 'printerId' },
        ]);
        // Generate order number
        const orderNumberResult = await client.query<{ order_number: string }>(
          'SELECT generate_order_number($1, $2) as order_number',
          [data.tenantId, data.shop_id],
        );
        const orderNumber = orderNumberResult.rows[0]?.order_number;

        const insertResult = await client.query<Order>(
          `INSERT INTO orders (
          tenant_id, shop_id, customer_id, quote_id, order_number, status,
          subtotal_cents, tax_cents, total_cents, currency,
          payment_status, paid_amount_cents, production_status, delivery_status,
          shipping_address, customer_notes, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *`,
          [
            data.tenantId,
            data.shop_id,
            data.customer_id,
            data.quote_id,
            orderNumber,
            data.status ?? 'pending',
            data.subtotal_cents,
            data.tax_cents,
            data.total_cents,
            data.currency ?? 'USD',
            data.payment_status ?? 'pending',
            data.paid_amount_cents ?? 0,
            data.production_status ?? 'not_started',
            data.delivery_status ?? 'not_shipped',
            JSON.stringify(data.shipping_address ?? {}),
            data.customer_notes ?? null,
            data.created_by ?? null,
            data.updated_by ?? null,
          ],
        );

        return insertResult.rows[0];
      },
    );

    if (!result) {
      throw new Error('Failed to create order');
    }

    return result;
  }

  async findById(id: string, tenantId: string): Promise<Order | null> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const queryResult = await client.query<Order>(
        `SELECT o.*, (SELECT c.name FROM customers c WHERE c.id = o.customer_id AND c.tenant_id = o.tenant_id) AS customer_name FROM orders o WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId],
      );
      return queryResult.rows[0] ?? null;
    });

    return result;
  }

  async findByQuoteId(quoteId: string, tenantId: string): Promise<Order | null> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const queryResult = await client.query<Order>(
        'SELECT * FROM orders WHERE quote_id = $1 AND tenant_id = $2',
        [quoteId, tenantId],
      );
      return queryResult.rows[0] ?? null;
    });

    return result;
  }

  async list(
    params: OrderListParams,
    tenantId: string,
  ): Promise<{
    data: Order[];
    total: number;
    page: number;
    perPage: number;
  }> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 20;
    const offset = (page - 1) * perPage;

    const conditions: string[] = ['tenant_id = $1'];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (params.shopId) {
      conditions.push(`shop_id = $${paramIndex}`);
      values.push(params.shopId);
      paramIndex++;
    }

    if (params.customerId) {
      conditions.push(`customer_id = $${paramIndex}`);
      values.push(params.customerId);
      paramIndex++;
    }

    if (params.status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(params.status);
      paramIndex++;
    }

    if (params.paymentStatus) {
      conditions.push(`payment_status = $${paramIndex}`);
      values.push(params.paymentStatus);
      paramIndex++;
    }

    if (params.productionStatus) {
      conditions.push(`production_status = $${paramIndex}`);
      values.push(params.productionStatus);
      paramIndex++;
    }

    if (params.deliveryStatus) {
      conditions.push(`delivery_status = $${paramIndex}`);
      values.push(params.deliveryStatus);
      paramIndex++;
    }

    if (params.search) {
      conditions.push(`(order_number ILIKE $${paramIndex} OR internal_notes ILIKE $${paramIndex})`);
      values.push(`%${params.search}%`);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const [dataResult, countResult] = await Promise.all([
        client.query<Order>(
          `SELECT o.*, (SELECT c.name FROM customers c WHERE c.id = o.customer_id AND c.tenant_id = o.tenant_id) AS customer_name FROM orders o ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
          [...values, perPage, offset],
        ),
        client.query<{ count: string }>(
          `SELECT COUNT(*) as count FROM orders ${whereClause}`,
          values,
        ),
      ]);

      return {
        data: dataResult.rows,
        total: parseInt(countResult.rows[0]?.count ?? '0', 10),
      };
    });

    return {
      ...result,
      page,
      perPage,
    };
  }

  async update(
    id: string,
    data: Partial<Omit<Order, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'order_number'>>,
    tenantId: string,
  ): Promise<Order | null> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        values.push(data.status);
        paramIndex++;
      }
      if (data.payment_status !== undefined) {
        updates.push(`payment_status = $${paramIndex}`);
        values.push(data.payment_status);
        paramIndex++;
      }
      if (data.paid_amount_cents !== undefined) {
        updates.push(`paid_amount_cents = $${paramIndex}`);
        values.push(data.paid_amount_cents);
        paramIndex++;
      }
      if (data.payment_method !== undefined) {
        updates.push(`payment_method = $${paramIndex}`);
        values.push(data.payment_method);
        paramIndex++;
      }
      if (data.payment_reference !== undefined) {
        updates.push(`payment_reference = $${paramIndex}`);
        values.push(data.payment_reference);
        paramIndex++;
      }
      if (data.paid_at !== undefined) {
        updates.push(`paid_at = $${paramIndex}`);
        values.push(data.paid_at);
        paramIndex++;
      }
      if (data.production_status !== undefined) {
        updates.push(`production_status = $${paramIndex}`);
        values.push(data.production_status);
        paramIndex++;
      }
      if (data.printer_id !== undefined) {
        updates.push(`printer_id = $${paramIndex}`);
        values.push(data.printer_id);
        paramIndex++;
      }
      if (data.started_at !== undefined) {
        updates.push(`started_at = $${paramIndex}`);
        values.push(data.started_at);
        paramIndex++;
      }
      if (data.completed_at !== undefined) {
        updates.push(`completed_at = $${paramIndex}`);
        values.push(data.completed_at);
        paramIndex++;
      }
      if (data.quality_check_status !== undefined) {
        updates.push(`quality_check_status = $${paramIndex}`);
        values.push(data.quality_check_status);
        paramIndex++;
      }
      if (data.quality_check_notes !== undefined) {
        updates.push(`quality_check_notes = $${paramIndex}`);
        values.push(data.quality_check_notes);
        paramIndex++;
      }
      if (data.quality_check_at !== undefined) {
        updates.push(`quality_check_at = $${paramIndex}`);
        values.push(data.quality_check_at);
        paramIndex++;
      }
      if (data.delivery_status !== undefined) {
        updates.push(`delivery_status = $${paramIndex}`);
        values.push(data.delivery_status);
        paramIndex++;
      }
      if (data.shipping_address !== undefined) {
        updates.push(`shipping_address = $${paramIndex}`);
        values.push(JSON.stringify(data.shipping_address));
        paramIndex++;
      }
      if (data.tracking_number !== undefined) {
        updates.push(`tracking_number = $${paramIndex}`);
        values.push(data.tracking_number);
        paramIndex++;
      }
      if (data.shipped_at !== undefined) {
        updates.push(`shipped_at = $${paramIndex}`);
        values.push(data.shipped_at);
        paramIndex++;
      }
      if (data.delivered_at !== undefined) {
        updates.push(`delivered_at = $${paramIndex}`);
        values.push(data.delivered_at);
        paramIndex++;
      }
      if (data.internal_notes !== undefined) {
        updates.push(`internal_notes = $${paramIndex}`);
        values.push(data.internal_notes);
        paramIndex++;
      }
      if (data.cancellation_reason !== undefined) {
        updates.push(`cancellation_reason = $${paramIndex}`);
        values.push(data.cancellation_reason);
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

      await assertTenantReferences(client, tenantId, [
        { table: 'printers', id: data.printer_id, field: 'printerId' },
      ]);

      updates.push(`updated_at = NOW()`);

      const updateResult = await client.query<Order>(
        `UPDATE orders SET ${updates.join(', ')}
         WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
         RETURNING *`,
        [...values, id, tenantId],
      );

      return updateResult.rows[0] ?? null;
    });

    return result;
  }

  // History methods
  async createHistory(
    orderId: string,
    data: Omit<OrderHistory, 'id' | 'order_id' | 'changed_at'>,
    tenantId: string,
  ): Promise<OrderHistory> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      if (!(await orderBelongsToTenant(client, orderId, tenantId))) {
        return undefined;
      }
      const insertResult = await client.query<OrderHistory>(
        `INSERT INTO order_history (order_id, old_status, new_status, status_type, changed_by, notes)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          orderId,
          data.old_status ?? null,
          data.new_status,
          data.status_type,
          data.changed_by ?? null,
          data.notes ?? null,
        ],
      );

      return insertResult.rows[0];
    });

    if (!result) {
      throw new Error('Failed to create order history');
    }

    return result;
  }

  async getHistoryByOrder(orderId: string, tenantId: string): Promise<OrderHistory[]> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const queryResult = await client.query<OrderHistory>(
        `SELECT * FROM order_history
         WHERE order_id = $1 AND ${orderInTenant(2)}
         ORDER BY changed_at DESC`,
        [orderId, tenantId],
      );
      return queryResult.rows;
    });

    return result;
  }

  // Order items methods
  async createItem(
    orderId: string,
    data: Omit<OrderItem, 'id' | 'order_id' | 'created_at' | 'total_price_cents'>,
    tenantId: string,
  ): Promise<OrderItem> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      if (!(await orderBelongsToTenant(client, orderId, tenantId))) {
        return undefined;
      }
      await assertTenantReferences(client, tenantId, [
        { table: 'printers', id: data.printer_id, field: 'printerId' },
      ]);
      const totalPriceCents = data.unit_price_cents * data.quantity;
      const insertResult = await client.query<OrderItem>(
        `INSERT INTO order_items (order_id, item_name, quantity, unit_price_cents, total_price_cents, production_status, printer_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          orderId,
          data.item_name,
          data.quantity,
          data.unit_price_cents,
          totalPriceCents,
          data.production_status ?? 'not_started',
          data.printer_id ?? null,
        ],
      );

      return insertResult.rows[0];
    });

    if (!result) {
      throw new Error('Failed to create order item');
    }

    return result;
  }

  async getItemsByOrder(orderId: string, tenantId: string): Promise<OrderItem[]> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const queryResult = await client.query<OrderItem>(
        `SELECT * FROM order_items WHERE order_id = $1 AND ${orderInTenant(2)} ORDER BY created_at`,
        [orderId, tenantId],
      );
      return queryResult.rows;
    });

    return result;
  }

  async updateItem(
    id: string,
    data: Partial<Omit<OrderItem, 'id' | 'order_id' | 'created_at' | 'total_price_cents'>>,
    tenantId: string,
  ): Promise<OrderItem | null> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.item_name !== undefined) {
        updates.push(`item_name = $${paramIndex}`);
        values.push(data.item_name);
        paramIndex++;
      }
      if (data.quantity !== undefined) {
        updates.push(`quantity = $${paramIndex}`);
        values.push(data.quantity);
        paramIndex++;
      }
      if (data.unit_price_cents !== undefined) {
        updates.push(`unit_price_cents = $${paramIndex}`);
        values.push(data.unit_price_cents);
        paramIndex++;
      }
      if (data.production_status !== undefined) {
        updates.push(`production_status = $${paramIndex}`);
        values.push(data.production_status);
        paramIndex++;
      }
      if (data.printer_id !== undefined) {
        updates.push(`printer_id = $${paramIndex}`);
        values.push(data.printer_id);
        paramIndex++;
      }

      if (updates.length === 0) {
        return null;
      }

      await assertTenantReferences(client, tenantId, [
        { table: 'printers', id: data.printer_id, field: 'printerId' },
      ]);

      // Recalculate total price if quantity or unit price changed
      if (data.quantity !== undefined || data.unit_price_cents !== undefined) {
        const itemResult = await client.query<OrderItem>(
          `SELECT * FROM order_items WHERE id = $1 AND ${orderInTenant(2)}`,
          [id, tenantId],
        );
        const item = itemResult.rows[0];
        if (item) {
          const newQuantity = data.quantity ?? item.quantity;
          const newUnitPrice = data.unit_price_cents ?? item.unit_price_cents;
          updates.push(`total_price_cents = $${paramIndex}`);
          values.push(newQuantity * newUnitPrice);
          paramIndex++;
        }
      }

      const updateResult = await client.query<OrderItem>(
        `UPDATE order_items SET ${updates.join(', ')}
         WHERE id = $${paramIndex} AND ${orderInTenant(paramIndex + 1)}
         RETURNING *`,
        [...values, id, tenantId],
      );

      return updateResult.rows[0] ?? null;
    });

    return result;
  }
}
