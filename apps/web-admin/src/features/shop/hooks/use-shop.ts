import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { shopApi } from '../api/shop-api';

export function useShops() {
  return useQuery({ queryKey: ['shops'], queryFn: shopApi.shops, staleTime: 5 * 60_000 });
}

/** The shop new records belong to: the first active shop of the tenant. */
export function useDefaultShopId(): string | undefined {
  const { data } = useShops();
  return data?.find((shop) => shop.is_active)?.id ?? data?.[0]?.id;
}

export function useTenantSettings() {
  return useQuery({ queryKey: ['tenant'], queryFn: shopApi.tenant, staleTime: 5 * 60_000 });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: shopApi.updateTenant,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenant'] }),
  });
}

/** Currency of the signed-in tenant, for displaying money before a record carries its own. */
export function useCurrency(): string {
  return useTenantSettings().data?.default_currency?.trim() || 'EGP';
}
