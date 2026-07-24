export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  tokenType: 'Bearer';
};

export type AuthSession = {
  user: AuthUser;
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  membershipId: string;
  roles: string[];
  permissions: string[];
  defaultShopId: string | null;
};

export type RegisterTenantInput = {
  email: string;
  password: string;
  fullName: string;
  tenantName: string;
  tenantSlug: string;
  shopName: string;
  shopCode?: string;
  defaultCurrency?: string;
  timezone?: string;
};

export type LoginInput = {
  email: string;
  password: string;
  tenantSlug?: string;
};

export type RegisterCustomerInput = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  companyName?: string;
  tenantSlug?: string;
};
