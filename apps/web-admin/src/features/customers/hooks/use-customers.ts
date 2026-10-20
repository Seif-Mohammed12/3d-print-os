import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { customersApi } from '../api/customers-api';
import type { CustomerInput } from '../model/customer-types';

export function useCustomers(params: { search?: string; page?: number } = {}) {
  return useQuery({ queryKey: ['customers', params], queryFn: () => customersApi.list(params) });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', id],
    queryFn: () => customersApi.get(id as string),
    enabled: !!id,
  });
}

export function useSaveCustomer(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerInput) =>
      id ? customersApi.update(id, input) : customersApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
}
