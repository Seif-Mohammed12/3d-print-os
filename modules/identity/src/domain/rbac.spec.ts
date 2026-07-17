import { describe, expect, it } from 'vitest';

import { ROLE_PERMISSION_MAP, ROLE_CODES } from './rbac';

describe('rbac seed map', () => {
  it('defines four system roles', () => {
    expect(ROLE_CODES).toEqual(['owner', 'admin', 'employee', 'customer']);
  });

  it('gives owner all permissions', () => {
    expect(ROLE_PERMISSION_MAP.owner).toContain('members:manage');
    expect(ROLE_PERMISSION_MAP.owner).toContain('settings:write');
    expect(ROLE_PERMISSION_MAP.owner).toContain('shops:write');
  });

  it('limits customer permissions', () => {
    expect(ROLE_PERMISSION_MAP.customer).toEqual(['roles:read']);
  });
});
