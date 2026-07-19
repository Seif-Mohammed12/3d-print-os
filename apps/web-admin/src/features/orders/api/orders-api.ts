import { apiClient } from '../../../shared/api/api-client';
import { handleApiError } from '../../../shared/api/api-error-handler';
import type { Order, CreateOrderInput, UpdateOrderInput, OrderListParams } from '../model/order-types';

export const ordersApi = {
  async list(params?: OrderListParams) {
    try {
      const response = await apiClient.instance.get<{ data: Order[]; meta: { total: number; page: number; per_page: number; total_pages: number } }>(
        '/orders',
        { params }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async get(id: string): Promise<Order> {
    try {
      const response = await apiClient.instance.get<{ data: Order }>(`/orders/${id}`);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async create(data: CreateOrderInput): Promise<Order> {
    try {
      const response = await apiClient.instance.post<{ data: Order }>('/orders', data);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async update(id: string, data: UpdateOrderInput): Promise<Order> {
    try {
      const response = await apiClient.instance.patch<{ data: Order }>(`/orders/${id}`, data);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await apiClient.instance.delete(`/orders/${id}`);
    } catch (error) {
      handleApiError(error);
    }
  },
};
