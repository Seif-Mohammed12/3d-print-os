import { createHash, randomBytes } from 'node:crypto';

import * as argon2 from 'argon2';

import type { IdentityRepository } from '../infrastructure/identity.repository';
import type { AuthSession, AuthTokens, LoginInput, RegisterTenantInput } from '../domain/types';

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
    const slug = this.normalizeSlug(input.tenantSlug);

    return this.repo.withBypass(async (client) => {
      if (await this.repo.slugExists(client, slug)) {
        throw new AuthDomainError('Tenant slug already taken', 'tenant.slug_taken', 409);
      }

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

      const tenant = await this.repo.createTenant(client, {
        slug,
        name: input.tenantName,
        defaultCurrency: input.defaultCurrency ?? 'EGP',
        timezone: input.timezone ?? 'Africa/Cairo',
      });

      const shop = await this.repo.createShop(client, {
        tenantId: tenant.id,
        code: (input.shopCode ?? 'MAIN').toUpperCase(),
        name: input.shopName,
        timezone: input.timezone ?? 'Africa/Cairo',
      });

      const roleIds = await this.repo.seedSystemRoles(client, tenant.id);
      const ownerRoleId = roleIds.get('owner');
      if (!ownerRoleId) {
        throw new AuthDomainError('Failed to seed owner role', 'auth.seed_failed', 500);
      }

      await this.repo.createMembership(client, {
        tenantId: tenant.id,
        userId: user.id,
        defaultShopId: shop.id,
        roleIds: [ownerRoleId],
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
