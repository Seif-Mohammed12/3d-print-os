export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  THEME: 'theme',
} as const;

export const THEME = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

export const PORTAL_TENANT_SLUG = import.meta.env.VITE_PORTAL_TENANT_SLUG ?? '';

export const STAFF_ROLES = ['owner', 'admin', 'employee'] as const;

/** Where a signed-in user lands: staff go to the shop app, customers to the portal. */
export function homePathForRoles(roles: readonly string[]): string {
  return roles.some((role) => (STAFF_ROLES as readonly string[]).includes(role))
    ? '/app'
    : '/portal/upload';
}
