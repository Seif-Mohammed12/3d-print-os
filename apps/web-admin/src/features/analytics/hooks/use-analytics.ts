import { useQuery } from '@tanstack/react-query';

import { analyticsApi } from '../api/analytics-api';
import type { AnalyticsParams } from '../model/analytics-types';

export function useAnalyticsStats(params?: AnalyticsParams) {
  return useQuery({
    queryKey: ['analytics', 'stats', params],
    queryFn: () => analyticsApi.getStats(params),
  });
}

export function useRevenue(params?: AnalyticsParams) {
  return useQuery({
    queryKey: ['analytics', 'revenue', params],
    queryFn: () => analyticsApi.getRevenue(params),
  });
}

export function useTopCustomers(params?: AnalyticsParams) {
  return useQuery({
    queryKey: ['analytics', 'top-customers', params],
    queryFn: () => analyticsApi.getTopCustomers(params),
  });
}
