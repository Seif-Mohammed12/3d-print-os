import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { portalApi, portalSettingsApi } from '../api/portal-api';

export function usePortalQuoteOptions() {
  return useQuery({
    queryKey: ['portal', 'quote-options'],
    queryFn: portalApi.quoteOptions,
    staleTime: 5 * 60_000,
  });
}

export function usePortalQuotes() {
  return useQuery({ queryKey: ['portal', 'quotes'], queryFn: portalApi.quotes });
}

export function usePortalOrders() {
  return useQuery({ queryKey: ['portal', 'orders'], queryFn: portalApi.orders });
}

export function useAcceptQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; expectedTotalCents: number; notes?: string }) =>
      portalApi.acceptQuote(id, input),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['portal', 'quotes'] });
      void queryClient.invalidateQueries({ queryKey: ['portal', 'orders'] });
    },
  });
}

export function usePortalSettings() {
  return useQuery({ queryKey: ['portal-settings'], queryFn: portalSettingsApi.get });
}

export function useUpdatePortalSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: portalSettingsApi.update,
    onSuccess: (data) => queryClient.setQueryData(['portal-settings'], data),
  });
}
