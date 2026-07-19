export interface User {
  id: string;
  email: string;
  full_name: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface AuthResponse {
  user: User;
  tenant: Tenant;
  roles: string[];
  permissions: string[];
  tokens: Tokens;
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  tenantName: string;
  tenantSlug: string;
  shopName: string;
  shopCode?: string;
  defaultCurrency?: string;
  timezone?: string;
}

export interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  roles: string[];
  permissions: string[];
  membershipId: string | null;
  defaultShopId: string | null;
  isAuthenticated: boolean;
}
