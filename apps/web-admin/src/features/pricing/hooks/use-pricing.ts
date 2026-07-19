import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { pricingApi } from '../api/pricing-api';
import type { CreatePricingRuleInput, UpdatePricingRuleInput, PricingRuleListParams } from '../model/pricing-types';

export function usePricingRules(params?: PricingRuleListParams) {
  return useQuery({
    queryKey: ['pricing', 'rules', params],
    queryFn: () => pricingApi.list(params),
  });
}

export function usePricingRule(id: string) {
  return useQuery({
    queryKey: ['pricing', 'rules', id],
    queryFn: () => pricingApi.get(id),
    enabled: !!id,
  });
}

export function useCreatePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePricingRuleInput) => pricingApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing', 'rules'] });
    },
  });
}

export function useUpdatePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePricingRuleInput }) =>
      pricingApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['pricing', 'rules'] });
      queryClient.invalidateQueries({ queryKey: ['pricing', 'rules', id] });
    },
  });
}

export function useDeletePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => pricingApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing', 'rules'] });
    },
  });
}
