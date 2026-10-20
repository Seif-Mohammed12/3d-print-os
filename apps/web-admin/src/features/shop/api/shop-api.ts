import { http } from '../../../shared/api/http';

export type Shop = {
  id: string;
  code: string;
  name: string;
  timezone: string | null;
  is_active: boolean;
};

export type TenantSettings = {
  id: string;
  slug: string;
  name: string;
  default_currency: string;
  timezone: string;
  tax_rate_bps?: number;
};

export const shopApi = {
  shops: () => http.get<Shop[]>('/shops'),
  tenant: () => http.get<TenantSettings>('/tenants/current'),
  updateTenant: (input: { name?: string; timezone?: string; taxRateBps?: number }) =>
    http.patch<TenantSettings>('/tenants/current', input),
};
