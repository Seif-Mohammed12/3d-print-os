import { http } from '../../../shared/api/http';
import type { Order } from '../../orders/model/order-types';
import type { CreateQuoteInput, Quote, QuoteStatus, UpdateQuoteInput } from '../model/quote-types';

export const quotesApi = {
  list: (params: { status?: QuoteStatus; customerId?: string; page?: number; perPage?: number }) =>
    http.list<Quote>('/quotes', params),
  get: (id: string) => http.get<Quote>(`/quotes/${id}`),
  create: (input: CreateQuoteInput) => http.post<Quote>('/quotes', input),
  update: (id: string, input: UpdateQuoteInput) => http.patch<Quote>(`/quotes/${id}`, input),
  /** Slices the model and prices the quote; can take a while for big parts. */
  analyze: (id: string) => http.post<Quote>(`/quotes/${id}/analyze`),
  approve: (id: string, notes?: string) => http.post<Quote>(`/quotes/${id}/approve`, { notes }),
  reject: (id: string, reason: string) => http.post<Quote>(`/quotes/${id}/reject`, { reason }),
  convertToOrder: (id: string) => http.post<Order>(`/quotes/${id}/convert-to-order`),
  remove: (id: string) => http.delete(`/quotes/${id}`),
};
