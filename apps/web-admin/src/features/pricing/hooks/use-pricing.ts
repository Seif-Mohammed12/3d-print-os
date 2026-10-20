import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { pricingApi } from '../api/pricing-api';
import type { PricingRuleInput } from '../model/pricing-types';

export function usePricingRules() {
  return useQuery({ queryKey: ['pricing-rules'], queryFn: pricingApi.list });
}

export function useSavePricingRule(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PricingRuleInput) =>
      id ? pricingApi.update(id, input) : pricingApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pricing-rules'] }),
  });
}
