import { http } from '../../../shared/api/http';
import type { Customer, CustomerInput } from '../model/customer-types';

export const customersApi = {
  list: (params: { search?: string; page?: number } = {}) =>
    http.list<Customer>('/customers', { ...params, per_page: 50 }),
  get: (id: string) => http.get<Customer>(`/customers/${id}`),
  create: (input: CustomerInput) => http.post<Customer>('/customers', input),
  update: (id: string, input: CustomerInput) => http.patch<Customer>(`/customers/${id}`, input),
};
