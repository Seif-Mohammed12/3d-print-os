import { apiClient } from '../../../shared/api/api-client';
import { handleApiError } from '../../../shared/api/api-error-handler';
import type { PricingRule, CreatePricingRuleInput, UpdatePricingRuleInput, PricingRuleListParams } from '../model/pricing-types';

export const pricingApi = {
  async list(params?: PricingRuleListParams) {
    try {
      const response = await apiClient.instance.get<{ data: PricingRule[]; meta: { total: number; page: number; per_page: number; total_pages: number } }>(
        '/pricing/rules',
        { params }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async get(id: string): Promise<PricingRule> {
    try {
      const response = await apiClient.instance.get<{ data: PricingRule }>(`/pricing/rules/${id}`);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async create(data: CreatePricingRuleInput): Promise<PricingRule> {
    try {
      const response = await apiClient.instance.post<{ data: PricingRule }>('/pricing/rules', data);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async update(id: string, data: UpdatePricingRuleInput): Promise<PricingRule> {
    try {
      const response = await apiClient.instance.patch<{ data: PricingRule }>(`/pricing/rules/${id}`, data);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await apiClient.instance.delete(`/pricing/rules/${id}`);
    } catch (error) {
      handleApiError(error);
    }
  },
};
