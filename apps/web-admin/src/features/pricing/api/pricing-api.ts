import { http } from '../../../shared/api/http';
import type { PricingRule, PricingRuleInput } from '../model/pricing-types';

export const pricingApi = {
  list: () => http.list<PricingRule>('/pricing/rules', { per_page: 100 }),
  create: (input: PricingRuleInput) => http.post<PricingRule>('/pricing/rules', input),
  update: (id: string, input: PricingRuleInput) =>
    http.patch<PricingRule>(`/pricing/rules/${id}`, input),
};
