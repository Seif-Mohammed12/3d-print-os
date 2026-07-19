import { apiClient } from '../../../shared/api/api-client';
import { handleApiError } from '../../../shared/api/api-error-handler';
import type { Customer, CreateCustomerInput, UpdateCustomerInput, CustomerListParams } from '../model/customer-types';

export const customersApi = {
  async list(params?: CustomerListParams) {
    try {
      const response = await apiClient.instance.get<{ data: Customer[]; meta: { total: number; page: number; per_page: number; total_pages: number } }>(
        '/customers',
        { params }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async get(id: string): Promise<Customer> {
    try {
      const response = await apiClient.instance.get<{ data: Customer }>(`/customers/${id}`);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async create(data: CreateCustomerInput): Promise<Customer> {
    try {
      const response = await apiClient.instance.post<{ data: Customer }>('/customers', data);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async update(id: string, data: UpdateCustomerInput): Promise<Customer> {
    try {
      const response = await apiClient.instance.patch<{ data: Customer }>(`/customers/${id}`, data);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await apiClient.instance.delete(`/customers/${id}`);
    } catch (error) {
      handleApiError(error);
    }
  },
};
