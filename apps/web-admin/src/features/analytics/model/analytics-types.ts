export interface AnalyticsStats {
  total_orders: number;
  total_revenue: number;
  active_customers: number;
  pending_orders: number;
  completed_orders: number;
  average_order_value: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopCustomer {
  id: string;
  name: string;
  total_orders: number;
  total_revenue: number;
}

export interface AnalyticsParams {
  start_date?: string;
  end_date?: string;
}
