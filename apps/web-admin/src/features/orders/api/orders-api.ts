import { ApiError } from '../../../shared/api/api-error-handler';
import { http } from '../../../shared/api/http';
import type {
  Order,
  OrderHistoryEntry,
  OrderListParams,
  PrintOutcome,
  RecordPrintOutcomeInput,
  UpdateOrderInput,
} from '../model/order-types';

export const ordersApi = {
  list: (params: OrderListParams) => http.list<Order>('/orders', params),
  get: (id: string) => http.get<Order>(`/orders/${id}`),
  update: (id: string, input: UpdateOrderInput) => http.patch<Order>(`/orders/${id}`, input),
  history: (id: string) => http.get<OrderHistoryEntry[]>(`/orders/${id}/history`),
  /** Null until staff record what the job actually took. */
  getOutcome: async (id: string): Promise<PrintOutcome | null> => {
    try {
      return await http.get<PrintOutcome>(`/orders/${id}/print-outcome`);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  },
  recordOutcome: (id: string, input: RecordPrintOutcomeInput) =>
    http.put<PrintOutcome>(`/orders/${id}/print-outcome`, input),
};
