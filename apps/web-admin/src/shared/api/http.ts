import { apiClient } from './api-client';
import { handleApiError } from './api-error-handler';

/** The API wraps every payload as `{ data }`, with `meta` on lists. */
export type ListResponse<T> = { data: T[]; meta?: Record<string, number> };

type Params = Record<string, string | number | boolean | undefined>;

function clean(params?: Params): Params | undefined {
  if (!params) {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  );
}

export const http = {
  async get<T>(url: string, params?: Params): Promise<T> {
    try {
      const response = await apiClient.instance.get<{ data: T }>(url, { params: clean(params) });
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async list<T>(url: string, params?: Params): Promise<ListResponse<T>> {
    try {
      const response = await apiClient.instance.get<ListResponse<T>>(url, {
        params: clean(params),
      });
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async post<T>(url: string, body?: unknown): Promise<T> {
    try {
      const response = await apiClient.instance.post<{ data: T }>(url, body);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async patch<T>(url: string, body: unknown): Promise<T> {
    try {
      const response = await apiClient.instance.patch<{ data: T }>(url, body);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async put<T>(url: string, body: unknown): Promise<T> {
    try {
      const response = await apiClient.instance.put<{ data: T }>(url, body);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async delete(url: string): Promise<void> {
    try {
      await apiClient.instance.delete(url);
    } catch (error) {
      handleApiError(error);
    }
  },
};
