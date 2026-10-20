import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { quotesApi } from '../api/quotes-api';
import type { CreateQuoteInput, QuoteStatus, UpdateQuoteInput } from '../model/quote-types';

export function useQuotes(params: {
  status?: QuoteStatus;
  customerId?: string;
  page?: number;
  perPage?: number;
}) {
  return useQuery({ queryKey: ['quotes', params], queryFn: () => quotesApi.list(params) });
}

export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: ['quotes', 'detail', id],
    queryFn: () => quotesApi.get(id as string),
    enabled: !!id,
  });
}

function useInvalidateQuotes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['quotes'] });
}

export function useCreateQuote() {
  const invalidate = useInvalidateQuotes();
  return useMutation({
    mutationFn: (input: CreateQuoteInput) => quotesApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateQuote(id: string) {
  const invalidate = useInvalidateQuotes();
  return useMutation({
    mutationFn: (input: UpdateQuoteInput) => quotesApi.update(id, input),
    onSuccess: invalidate,
  });
}

export function useAnalyzeQuote() {
  const invalidate = useInvalidateQuotes();
  return useMutation({ mutationFn: (id: string) => quotesApi.analyze(id), onSuccess: invalidate });
}

export function useApproveQuote(id: string) {
  const invalidate = useInvalidateQuotes();
  return useMutation({
    mutationFn: (notes?: string) => quotesApi.approve(id, notes),
    onSuccess: invalidate,
  });
}

export function useRejectQuote(id: string) {
  const invalidate = useInvalidateQuotes();
  return useMutation({
    mutationFn: (reason: string) => quotesApi.reject(id, reason),
    onSuccess: invalidate,
  });
}

export function useConvertQuote(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => quotesApi.convertToOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useDeleteQuote() {
  const invalidate = useInvalidateQuotes();
  return useMutation({ mutationFn: (id: string) => quotesApi.remove(id), onSuccess: invalidate });
}
