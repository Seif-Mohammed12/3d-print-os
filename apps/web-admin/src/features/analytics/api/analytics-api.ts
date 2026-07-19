import { apiClient } from '../../../shared/api/api-client';
import { handleApiError } from '../../../shared/api/api-error-handler';
import type { AnalyticsStats, RevenueData, TopCustomer, AnalyticsParams } from '../model/analytics-types';

export const analyticsApi = {
  async getStats(params?: AnalyticsParams): Promise<AnalyticsStats> {
    try {
      const response = await apiClient.instance.get<{ data: AnalyticsStats }>('/analytics/stats', { params });
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async getRevenue(params?: AnalyticsParams): Promise<RevenueData[]> {
    try {
      const response = await apiClient.instance.get<{ data: RevenueData[] }>('/analytics/revenue', { params });
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async getTopCustomers(params?: AnalyticsParams): Promise<TopCustomer[]> {
    try {
      const response = await apiClient.instance.get<{ data: TopCustomer[] }>('/analytics/top-customers', { params });
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },
};
