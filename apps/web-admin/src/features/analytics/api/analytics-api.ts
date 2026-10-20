import { http } from '../../../shared/api/http';

/** Analytics come from SQL views; counts and sums can arrive as strings. */
type N = number | string;

export type DailySummary = {
  date: string;
  total_orders: N;
  total_revenue_cents: N;
  average_order_value_cents: N;
  unique_customers: N;
  completed_orders: N;
  in_production_orders: N;
};

export type PrinterUtilization = {
  printer_id: string;
  printer_name: string;
  total_orders: N;
  active_orders: N;
  completed_orders: N;
  failed_orders: N;
  total_revenue_cents: N;
  success_rate_percentage: N;
};

export type MaterialUsage = {
  material_name: string;
  material_type: string;
  order_count: N;
  total_revenue_cents: N;
};

export type CustomerSpend = {
  customer_id: string;
  total_orders: N;
  total_spent_cents: N;
  last_order_date: string;
};

export const analyticsApi = {
  daily: (startDate: string, endDate: string) =>
    http.get<DailySummary[]>('/analytics/daily-summary', { startDate, endDate }),
  printers: () => http.get<PrinterUtilization[]>('/analytics/printers'),
  materials: () => http.get<MaterialUsage[]>('/analytics/materials'),
  customers: (limit = 5) => http.get<CustomerSpend[]>('/analytics/customers', { limit }),
};
