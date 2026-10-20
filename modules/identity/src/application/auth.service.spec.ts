import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IdentityRepository } from '../infrastructure/identity.repository';
import type { AuthSession, RegisterCustomerInput } from '../domain/types';
import { AuthDomainError, AuthService, type TokenIssuer } from './auth.service';

vi.mock('argon2', () => ({
  argon2id: 2,
  hash: vi.fn(async (password: string) => `hashed:${password}`),
  verify: vi.fn(),
}));

const tenant = { id: 'tenant-1', slug: 'acme', name: 'Acme Prints' };
const user = { id: 'user-1', email: 'jane@example.com', fullName: 'Jane Doe' };
const session: AuthSession = {
  user,
  tenant,
  membershipId: 'membership-1',
  roles: ['customer'],
  permissions: ['portal:quotes:create', 'portal:upload'],
  defaultShopId: null,
};

function createRepo() {
  const client = {};
  const repo = {
    withBypass: vi.fn(async (work: (c: unknown) => Promise<unknown>) => work(client)),
    findTenantBySlug: vi.fn(async () => tenant),
    findUserByEmail: vi.fn(async () => null),
    findRoleIdsByCodes: vi.fn(async () => ['tenant-customer-role']),
    findRoleByCode: vi.fn(async () => ({ id: 'system-customer-role' })),
    createUser: vi.fn(async () => user),
    createCustomer: vi.fn(async () => 'customer-1'),
    createMembership: vi.fn(async () => 'membership-1'),
    loadSession: vi.fn(async () => session),
    storeRefreshToken: vi.fn(async () => undefined),
  };
  return repo;
}

const tokenIssuer: TokenIssuer = {
  signAccessToken: vi.fn(async () => ({ token: 'access-token', expiresInSeconds: 900 })),
};

const input: RegisterCustomerInput = {
  email: 'jane@example.com',
  password: 'correct-horse',
  fullName: 'Jane Doe',
  phone: '+1 555 0100',
  companyName: 'Doe Labs',
  tenantSlug: 'Acme',
};

describe('AuthService.registerCustomer', () => {
  let repo: ReturnType<typeof createRepo>;
  let service: AuthService;

  beforeEach(() => {
    repo = createRepo();
    service = new AuthService(repo as unknown as IdentityRepository, tokenIssuer);
  });

  it('creates the user, portal customer and customer membership in the resolved tenant', async () => {
    const result = await service.registerCustomer(input);

    expect(repo.findTenantBySlug).toHaveBeenCalledWith(expect.anything(), 'acme');
    expect(repo.createUser).toHaveBeenCalledWith(expect.anything(), {
      email: input.email,
      fullName: input.fullName,
      passwordHash: 'hashed:correct-horse',
    });
    expect(repo.createCustomer).toHaveBeenCalledWith(expect.anything(), {
      userId: user.id,
      tenantId: tenant.id,
      phone: input.phone,
      companyName: input.companyName,
    });
    expect(repo.createMembership).toHaveBeenCalledWith(expect.anything(), {
      tenantId: tenant.id,
      userId: user.id,
      defaultShopId: null,
      roleIds: ['tenant-customer-role'],
    });
    expect(repo.findRoleByCode).not.toHaveBeenCalled();

    expect(result.session).toEqual(session);
    expect(result.tokens).toMatchObject({
      accessToken: 'access-token',
      expiresInSeconds: 900,
      tokenType: 'Bearer',
    });
    expect(result.tokens.refreshToken).toEqual(expect.any(String));
    expect(repo.storeRefreshToken).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: user.id, tenantId: tenant.id }),
    );
  });

  it('falls back to the system-wide customer role when the tenant has none', async () => {
    repo.findRoleIdsByCodes.mockResolvedValueOnce([]);

    await service.registerCustomer(input);

    expect(repo.createMembership).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ roleIds: ['system-customer-role'] }),
    );
  });

  it('rejects an unknown tenant slug without creating anything', async () => {
    repo.findTenantBySlug.mockResolvedValueOnce(null as never);

    await expect(service.registerCustomer(input)).rejects.toMatchObject({
      code: 'auth.tenant_not_found',
      statusCode: 404,
    });
    expect(repo.createUser).not.toHaveBeenCalled();
    expect(repo.createMembership).not.toHaveBeenCalled();
  });

  it('rejects a blank tenant slug', async () => {
    await expect(service.registerCustomer({ ...input, tenantSlug: '  ' })).rejects.toMatchObject({
      code: 'auth.tenant_required',
      statusCode: 400,
    });
    expect(repo.withBypass).not.toHaveBeenCalled();
  });

  it('rejects a duplicate email with 409', async () => {
    repo.findUserByEmail.mockResolvedValueOnce({ ...user, passwordHash: 'x' } as never);

    const error = await service.registerCustomer(input).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AuthDomainError);
    expect(error).toMatchObject({ code: 'auth.email_taken', statusCode: 409 });
    expect(repo.createUser).not.toHaveBeenCalled();
    expect(repo.createCustomer).not.toHaveBeenCalled();
  });

  it('rejects a weak password before touching the database', async () => {
    await expect(service.registerCustomer({ ...input, password: 'short' })).rejects.toMatchObject({
      code: 'auth.weak_password',
    });
    expect(repo.withBypass).not.toHaveBeenCalled();
  });

  it('fails when no customer role exists', async () => {
    repo.findRoleIdsByCodes.mockResolvedValueOnce([]);
    repo.findRoleByCode.mockResolvedValueOnce(null as never);

    await expect(service.registerCustomer(input)).rejects.toMatchObject({
      code: 'auth.role_not_found',
    });
    expect(repo.createUser).not.toHaveBeenCalled();
  });
});
