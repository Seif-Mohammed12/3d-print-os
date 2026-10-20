import { useQuery } from '@tanstack/react-query';

import { analyticsApi } from '../api/analytics-api';

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Inclusive range of the last `days` days, ending today. */
export function lastDays(days: number): { startDate: string; endDate: string; days: string[] } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  const list: string[] = [];
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    list.push(isoDay(d));
  }
  return { startDate: isoDay(start), endDate: isoDay(end), days: list };
}

export function useDailySummary(days: number) {
  const range = lastDays(days);
  return useQuery({
    queryKey: ['analytics', 'daily', range.startDate, range.endDate],
    queryFn: () => analyticsApi.daily(range.startDate, range.endDate),
    select: (rows) => {
      // Views return one row per day with activity; fill the gaps with zeros.
      const byDay = new Map<string, { revenue: number; orders: number; customers: number }>();
      for (const row of rows) {
        const key = String(row.date).slice(0, 10);
        const current = byDay.get(key) ?? { revenue: 0, orders: 0, customers: 0 };
        byDay.set(key, {
          revenue: current.revenue + Number(row.total_revenue_cents),
          orders: current.orders + Number(row.total_orders),
          customers: current.customers + Number(row.unique_customers),
        });
      }
      return range.days.map((day) => ({
        day,
        ...(byDay.get(day) ?? { revenue: 0, orders: 0, customers: 0 }),
      }));
    },
  });
}

export function usePrinterUtilization() {
  return useQuery({ queryKey: ['analytics', 'printers'], queryFn: analyticsApi.printers });
}

export function useMaterialUsage() {
  return useQuery({ queryKey: ['analytics', 'materials'], queryFn: analyticsApi.materials });
}

export function useTopCustomers() {
  return useQuery({
    queryKey: ['analytics', 'customers'],
    queryFn: () => analyticsApi.customers(5),
  });
}
