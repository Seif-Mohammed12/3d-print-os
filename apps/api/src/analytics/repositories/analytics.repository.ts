import type { Pool } from 'pg';
import { withTenantSession } from '@3d-print-os/persistence';

export interface RevenueAnalytics {
  tenant_id: string;
  shop_id: string;
  month: Date;
  week: Date;
  day: Date;
  total_orders: number;
  total_revenue_cents: number;
  average_order_value_cents: number;
  paid_revenue_cents: number;
  pending_revenue_cents: number;
  partial_revenue_cents: number;
}

export interface MaterialUsageAnalytics {
  tenant_id: string;
  material_type: string;
  brand: string;
  material_name: string;
  order_count: number;
  unique_customers: number;
  total_revenue_cents: number;
  average_order_value_cents: number;
}

export interface PrinterUtilizationAnalytics {
  tenant_id: string;
  shop_id: string;
  printer_id: string;
  printer_name: string;
  technology: string;
  total_orders: number;
  active_orders: number;
  completed_orders: number;
  failed_orders: number;
  total_revenue_cents: number;
  success_rate_percentage: number;
  failure_rate_percentage: number;
}

export interface OrderStatusAnalytics {
  tenant_id: string;
  shop_id: string;
  status: string;
  payment_status: string;
  production_status: string;
  delivery_status: string;
  order_count: number;
  total_value_cents: number;
  average_value_cents: number;
  first_order: Date;
  last_order: Date;
}

export interface CustomerAnalytics {
  tenant_id: string;
  shop_id: string;
  customer_id: string;
  total_orders: number;
  total_spent_cents: number;
  average_order_value_cents: number;
  first_order_date: Date;
  last_order_date: Date;
  customer_lifetime_days: number;
  months_active: number;
  completed_orders: number;
  cancelled_orders: number;
  completion_rate_percentage: number;
}

export interface ProfitabilityAnalytics {
  tenant_id: string;
  shop_id: string;
  material_type: string;
  material_name: string;
  order_count: number;
  total_revenue_cents: number;
  total_material_cost_cents: number;
  total_machine_cost_cents: number;
  total_electricity_cost_cents: number;
  total_maintenance_cost_cents: number;
  total_production_cost_cents: number;
  gross_profit_cents: number;
  profit_margin_percentage: number;
}

export interface DailySummaryAnalytics {
  tenant_id: string;
  shop_id: string;
  date: Date;
  total_orders: number;
  total_revenue_cents: number;
  average_order_value_cents: number;
  unique_customers: number;
  completed_orders: number;
  cancelled_orders: number;
  in_production_orders: number;
}

export class AnalyticsRepository {
  constructor(private pool: Pool) {}

  async getRevenueAnalytics(
    tenantId: string,
    shopId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<RevenueAnalytics[]> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const conditions: string[] = ['tenant_id = $1'];
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      if (shopId) {
        conditions.push(`shop_id = $${paramIndex}`);
        values.push(shopId);
        paramIndex++;
      }

      if (startDate) {
        conditions.push(`day >= $${paramIndex}`);
        values.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        conditions.push(`day <= $${paramIndex}`);
        values.push(endDate);
        paramIndex++;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const queryResult = await client.query<RevenueAnalytics>(
        `SELECT * FROM analytics_revenue ${whereClause} ORDER BY day DESC`,
        values,
      );

      return queryResult.rows;
    });

    return result;
  }

  async getMaterialUsageAnalytics(
    tenantId: string,
    shopId?: string,
  ): Promise<MaterialUsageAnalytics[]> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const conditions: string[] = ['tenant_id = $1'];
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      if (shopId) {
        conditions.push(`shop_id = $${paramIndex}`);
        values.push(shopId);
        paramIndex++;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const queryResult = await client.query<MaterialUsageAnalytics>(
        `SELECT * FROM analytics_material_usage ${whereClause} ORDER BY total_revenue_cents DESC`,
        values,
      );

      return queryResult.rows;
    });

    return result;
  }

  async getPrinterUtilizationAnalytics(
    tenantId: string,
    shopId?: string,
  ): Promise<PrinterUtilizationAnalytics[]> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const conditions: string[] = ['tenant_id = $1'];
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      if (shopId) {
        conditions.push(`shop_id = $${paramIndex}`);
        values.push(shopId);
        paramIndex++;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const queryResult = await client.query<PrinterUtilizationAnalytics>(
        `SELECT * FROM analytics_printer_utilization ${whereClause} ORDER BY total_orders DESC`,
        values,
      );

      return queryResult.rows;
    });

    return result;
  }

  async getOrderStatusAnalytics(
    tenantId: string,
    shopId?: string,
  ): Promise<OrderStatusAnalytics[]> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const conditions: string[] = ['tenant_id = $1'];
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      if (shopId) {
        conditions.push(`shop_id = $${paramIndex}`);
        values.push(shopId);
        paramIndex++;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const queryResult = await client.query<OrderStatusAnalytics>(
        `SELECT * FROM analytics_order_status ${whereClause} ORDER BY order_count DESC`,
        values,
      );

      return queryResult.rows;
    });

    return result;
  }

  async getCustomerAnalytics(
    tenantId: string,
    shopId?: string,
    limit: number = 50,
  ): Promise<CustomerAnalytics[]> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const conditions: string[] = ['tenant_id = $1'];
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      if (shopId) {
        conditions.push(`shop_id = $${paramIndex}`);
        values.push(shopId);
        paramIndex++;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const queryResult = await client.query<CustomerAnalytics>(
        `SELECT * FROM analytics_customers ${whereClause} ORDER BY total_spent_cents DESC LIMIT $${paramIndex}`,
        [...values, limit],
      );

      return queryResult.rows;
    });

    return result;
  }

  async getProfitabilityAnalytics(
    tenantId: string,
    shopId?: string,
  ): Promise<ProfitabilityAnalytics[]> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const conditions: string[] = ['tenant_id = $1'];
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      if (shopId) {
        conditions.push(`shop_id = $${paramIndex}`);
        values.push(shopId);
        paramIndex++;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const queryResult = await client.query<ProfitabilityAnalytics>(
        `SELECT * FROM analytics_profitability ${whereClause} ORDER BY gross_profit_cents DESC`,
        values,
      );

      return queryResult.rows;
    });

    return result;
  }

  async getDailySummaryAnalytics(
    tenantId: string,
    shopId?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 90,
  ): Promise<DailySummaryAnalytics[]> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const conditions: string[] = ['tenant_id = $1'];
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      if (shopId) {
        conditions.push(`shop_id = $${paramIndex}`);
        values.push(shopId);
        paramIndex++;
      }

      if (startDate) {
        conditions.push(`date >= $${paramIndex}`);
        values.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        conditions.push(`date <= $${paramIndex}`);
        values.push(endDate);
        paramIndex++;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const queryResult = await client.query<DailySummaryAnalytics>(
        `SELECT * FROM analytics_daily_summary ${whereClause} ORDER BY date DESC LIMIT $${paramIndex}`,
        [...values, limit],
      );

      return queryResult.rows;
    });

    return result;
  }
}
