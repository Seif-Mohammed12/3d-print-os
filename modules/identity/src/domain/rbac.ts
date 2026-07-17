export const PERMISSION_CODES = [
  'settings:read',
  'settings:write',
  'members:read',
  'members:manage',
  'shops:read',
  'shops:write',
  'roles:read',
] as const;

export type PermissionCode = (typeof PERMISSION_CODES)[number];

export const ROLE_CODES = ['owner', 'admin', 'employee', 'customer'] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

export const ROLE_PERMISSION_MAP: Record<RoleCode, readonly PermissionCode[]> = {
  owner: PERMISSION_CODES,
  admin: [
    'settings:read',
    'settings:write',
    'members:read',
    'members:manage',
    'shops:read',
    'shops:write',
    'roles:read',
  ],
  employee: ['settings:read', 'members:read', 'shops:read', 'roles:read'],
  customer: ['roles:read'],
};

export const ROLE_DISPLAY_NAMES: Record<RoleCode, string> = {
  owner: 'Shop Owner',
  admin: 'Admin',
  employee: 'Employee',
  customer: 'Customer',
};
