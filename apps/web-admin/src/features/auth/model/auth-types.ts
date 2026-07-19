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

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
  };
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  roles: string[];
  permissions: string[];
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
}
