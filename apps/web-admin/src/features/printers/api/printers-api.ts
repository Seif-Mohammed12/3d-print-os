import { apiClient } from '../../../shared/api/api-client';
import { handleApiError } from '../../../shared/api/api-error-handler';
import type { Printer, CreatePrinterInput, UpdatePrinterInput, PrinterListParams } from '../model/printer-types';

export const printersApi = {
  async list(params?: PrinterListParams) {
    try {
      const response = await apiClient.instance.get<{ data: Printer[]; meta: { total: number; page: number; per_page: number; total_pages: number } }>(
        '/printers',
        { params }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async get(id: string): Promise<Printer> {
    try {
      const response = await apiClient.instance.get<{ data: Printer }>(`/printers/${id}`);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async create(data: CreatePrinterInput): Promise<Printer> {
    try {
      const response = await apiClient.instance.post<{ data: Printer }>('/printers', data);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async update(id: string, data: UpdatePrinterInput): Promise<Printer> {
    try {
      const response = await apiClient.instance.patch<{ data: Printer }>(`/printers/${id}`, data);
      return response.data.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await apiClient.instance.delete(`/printers/${id}`);
    } catch (error) {
      handleApiError(error);
    }
  },
};
