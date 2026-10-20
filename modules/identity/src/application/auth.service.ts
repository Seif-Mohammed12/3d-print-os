import { createHash, randomBytes } from 'node:crypto';

import * as argon2 from 'argon2';

import type { IdentityRepository } from '../infrastructure/identity.repository';
import type {
  AuthSession,
  AuthTokens,
  LoginInput,
  RegisterTenantInput,
  RegisterCustomerInput,
} from '../domain/types';

export class AuthDomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AuthDomainError';
  }
}

export type TokenIssuer = {
  signAccessToken: (claims: {
    sub: string;
    tid: string;
    roles: string[];
    permissions: string[];
  }) => Promise<{ token: string; expiresInSeconds: number }>;
};

export class AuthService {
  constructor(
    private readonly repo: IdentityRepository,
    private readonly tokenIssuer: TokenIssuer,
    private readonly refreshTtlDays: number = 30,
  ) {}

  async register(
    input: RegisterTenantInput,
  ): Promise<{ session: AuthSession; tokens: AuthTokens }> {
    this.assertPassword(input.password);

    return this.repo.withBypass(async (client) => {
      const existingUser = await this.repo.findUserByEmail(client, input.email);
      if (existingUser) {
        throw new AuthDomainError('Email already registered', 'auth.email_taken', 409);
      }

      const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
      const user = await this.repo.createUser(client, {
        email: input.email,
        fullName: input.fullName,
        passwordHash,
      });

      // Use existing tenant or default to first available
      let tenant;
      if (input.tenantSlug) {
        tenant = await this.repo.findTenantBySlug(client, input.tenantSlug);
      }
      if (!tenant) {
        const tenants = await this.repo.listTenants(client);
        if (tenants.length === 0) {
          throw new AuthDomainError('No tenant available', 'auth.no_tenant', 500);
        }
        tenant = tenants[0];
      }

      if (!tenant) {
        throw new AuthDomainError('Failed to resolve tenant', 'auth.tenant_resolution_failed', 500);
      }

      // Default to customer role for all new registrations
      const customerRole = await this.repo.findRoleByCode(client, 'customer');
      if (!customerRole) {
        throw new AuthDomainError('Customer role not found', 'auth.role_not_found', 500);
      }

      // Create customer record
      await this.repo.createCustomer(client, {
        userId: user.id,
        tenantId: tenant.id,
        phone: undefined,
        companyName: undefined,
      });

      // Create membership with customer role
      await this.repo.createMembership(client, {
        tenantId: tenant.id,
        userId: user.id,
        defaultShopId: null,
        roleIds: [customerRole.id],
      });

      const session = await this.repo.loadSession(client, {
        userId: user.id,
        tenantId: tenant.id,
      });
      if (!session) {
        throw new AuthDomainError('Failed to load session', 'auth.session_failed', 500);
      }

      const tokens = await this.issueTokens(client, session);
      return { session, tokens };
    });
  }

  async registerCustomer(
    input: RegisterCustomerInput,
  ): Promise<{ session: AuthSession; tokens: AuthTokens }> {
    this.assertPassword(input.password);
    const tenantSlug = input.tenantSlug.trim().toLowerCase();
    if (!tenantSlug) {
      throw new AuthDomainError('Tenant slug is required', 'auth.tenant_required', 400);
    }

    return this.repo.withBypass(async (client) => {
      const tenant = await this.repo.findTenantBySlug(client, tenantSlug);
      if (!tenant) {
        throw new AuthDomainError('Tenant not found', 'auth.tenant_not_found', 404);
      }

      const existingUser = await this.repo.findUserByEmail(client, input.email);
      if (existingUser) {
        throw new AuthDomainError('Email already registered', 'auth.email_taken', 409);
      }

      // Prefer the tenant's own customer role; fall back to the system-wide one from 010.
      const [tenantRoleId] = await this.repo.findRoleIdsByCodes(client, tenant.id, ['customer']);
      const customerRoleId = tenantRoleId ?? (await this.repo.findRoleByCode(client, 'customer'))?.id;
      if (!customerRoleId) {
        throw new AuthDomainError('Customer role not found', 'auth.role_not_found', 500);
      }

      const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
      const user = await this.repo.createUser(client, {
        email: input.email,
        fullName: input.fullName,
        passwordHash,
      });

      await this.repo.createCustomer(client, {
        userId: user.id,
        tenantId: tenant.id,
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
      });

      // Customers don't need a default shop
      await this.repo.createMembership(client, {
        tenantId: tenant.id,
        userId: user.id,
        defaultShopId: null,
        roleIds: [customerRoleId],
      });

      const session = await this.repo.loadSession(client, {
        userId: user.id,
        tenantId: tenant.id,
      });
      if (!session) {
        throw new AuthDomainError('Failed to load session', 'auth.session_failed', 500);
      }

      const tokens = await this.issueTokens(client, session);
      return { session, tokens };
    });
  }

  async login(input: LoginInput): Promise<{ session: AuthSession; tokens: AuthTokens }> {
    return this.repo.withBypass(async (client) => {
      const user = await this.repo.findUserByEmail(client, input.email);
      if (!user) {
        throw new AuthDomainError('Invalid email or password', 'auth.invalid_credentials', 401);
      }

      const valid = await argon2.verify(user.passwordHash, input.password);
      if (!valid) {
        throw new AuthDomainError('Invalid email or password', 'auth.invalid_credentials', 401);
      }

      const memberships = await this.repo.listMembershipsForUser(client, user.id);
      if (memberships.length === 0) {
        throw new AuthDomainError('No active tenant membership', 'auth.no_membership', 403);
      }

      let membership = memberships[0]!;
      if (input.tenantSlug) {
        const slug = input.tenantSlug.toLowerCase();
        const matched = memberships.find((item) => item.tenantSlug === slug);
        if (!matched) {
          throw new AuthDomainError('Tenant membership not found', 'auth.tenant_not_found', 404);
        }
        membership = matched;
      }

      const session = await this.repo.loadSession(client, {
        userId: user.id,
        tenantId: membership.tenantId,
      });
      if (!session) {
        throw new AuthDomainError('Failed to load session', 'auth.session_failed', 500);
      }

      const tokens = await this.issueTokens(client, session);
      return { session, tokens };
    });
  }

  async refresh(refreshToken: string): Promise<{ session: AuthSession; tokens: AuthTokens }> {
    const tokenHash = hashToken(refreshToken);
    return this.repo.withBypass(async (client) => {
      const stored = await this.repo.findRefreshToken(client, tokenHash);
      if (!stored || stored.revokedAt || stored.expiresAt.getTime() < Date.now()) {
        throw new AuthDomainError('Invalid refresh token', 'auth.invalid_refresh', 401);
      }

      await this.repo.revokeRefreshToken(client, tokenHash);

      const session = await this.repo.loadSession(client, {
        userId: stored.userId,
        tenantId: stored.tenantId,
      });
      if (!session) {
        throw new AuthDomainError('Session no longer valid', 'auth.session_invalid', 401);
      }

      const tokens = await this.issueTokens(client, session);
      return { session, tokens };
    });
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await this.repo.withBypass(async (client) => {
      await this.repo.revokeRefreshToken(client, tokenHash);
    });
  }

  async getSession(userId: string, tenantId: string): Promise<AuthSession> {
    const session = await this.repo.withTenant(tenantId, (client) =>
      this.repo.loadSession(client, { userId, tenantId }),
    );
    if (!session) {
      // membership might need bypass if RLS blocks before tenant set incorrectly
      const fallback = await this.repo.withBypass((client) =>
        this.repo.loadSession(client, { userId, tenantId }),
      );
      if (!fallback) {
        throw new AuthDomainError('Session not found', 'auth.session_not_found', 401);
      }
      return fallback;
    }
    return session;
  }

  private async issueTokens(
    client: Parameters<IdentityRepository['storeRefreshToken']>[0],
    session: AuthSession,
  ): Promise<AuthTokens> {
    const access = await this.tokenIssuer.signAccessToken({
      sub: session.user.id,
      tid: session.tenant.id,
      roles: session.roles,
      permissions: session.permissions,
    });

    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000);
    await this.repo.storeRefreshToken(client, {
      userId: session.user.id,
      tenantId: session.tenant.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    });

    return {
      accessToken: access.token,
      refreshToken,
      expiresInSeconds: access.expiresInSeconds,
      tokenType: 'Bearer',
    };
  }

  private assertPassword(password: string): void {
    if (password.length < 8) {
      throw new AuthDomainError(
        'Password must be at least 8 characters',
        'auth.weak_password',
        400,
      );
    }
  }

  private normalizeSlug(slug: string): string {
    const normalized = slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
      throw new AuthDomainError(
        'Slug must be lowercase alphanumeric with hyphens',
        'tenant.invalid_slug',
        400,
      );
    }
    return normalized;
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
