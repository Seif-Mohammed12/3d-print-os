import { Injectable } from '@nestjs/common';
import { withTenantSession } from '@3d-print-os/persistence';
import type { Pool } from 'pg';

@Injectable()
export class PortalService {
  constructor(private readonly pool: Pool) {}

  async getCustomerQuotes(userId: string, tenantId: string) {
    return withTenantSession(this.pool, { tenantId }, async (client) => {
      const result = await client.query(
        `SELECT cq.*, pc.company_name, pc.phone
         FROM customer_quotes cq
         INNER JOIN portal_customers pc ON pc.id = cq.customer_id
         WHERE pc.user_id = $1 AND cq.tenant_id = $2
         ORDER BY cq.created_at DESC`,
        [userId, tenantId],
      );
      return result.rows;
    });
  }

  async createQuoteRequest(
    userId: string,
    tenantId: string,
    data: { modelFileId?: string; notes?: string },
  ) {
    return withTenantSession(this.pool, { tenantId }, async (client) => {
      // Get customer record
      const customerResult = await client.query(
        `SELECT id FROM portal_customers WHERE user_id = $1 AND tenant_id = $2`,
        [userId, tenantId],
      );
      const customerId = customerResult.rows[0]?.id;
      if (!customerId) {
        throw new Error('Customer not found');
      }

      // Create quote request
      const result = await client.query(
        `INSERT INTO customer_quotes (customer_id, tenant_id, model_file_id, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [customerId, tenantId, data.modelFileId || null, data.notes || null],
      );
      return result.rows[0];
    });
  }

  async getCustomerOrders(userId: string, tenantId: string) {
    return withTenantSession(this.pool, { tenantId }, async (client) => {
      const result = await client.query(
        `SELECT co.*, pc.company_name
         FROM customer_orders co
         INNER JOIN portal_customers pc ON pc.id = co.customer_id
         WHERE pc.user_id = $1 AND co.tenant_id = $2
         ORDER BY co.created_at DESC`,
        [userId, tenantId],
      );
      return result.rows;
    });
  }
}
