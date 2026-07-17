import type { Pool, PoolClient } from 'pg';

import { withTenantSession } from '@3d-print-os/persistence';

import { ROLE_CODES, ROLE_DISPLAY_NAMES, ROLE_PERMISSION_MAP, type RoleCode } from '../domain/rbac';
import type { AuthSession, AuthUser } from '../domain/types';

export class IdentityRepository {
  constructor(private readonly pool: Pool) {}

  async withBypass<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    return withTenantSession(this.pool, { bypassRls: true }, work);
  }

  async withTenant<T>(tenantId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    return withTenantSession(this.pool, { tenantId }, work);
  }

  async findUserByEmail(
    client: PoolClient,
    email: string,
  ): Promise<(AuthUser & { passwordHash: string }) | null> {
    const result = await client.query<{
      id: string;
      email: string;
      full_name: string;
      password_hash: string;
    }>(
      `SELECT id, email, full_name, password_hash
       FROM users
       WHERE lower(email) = lower($1) AND deleted_at IS NULL
       LIMIT 1`,
      [email],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      passwordHash: row.password_hash,
    };
  }

  async findUserById(client: PoolClient, userId: string): Promise<AuthUser | null> {
    const result = await client.query<{ id: string; email: string; full_name: string }>(
      `SELECT id, email, full_name FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return { id: row.id, email: row.email, fullName: row.full_name };
  }

  async createUser(
    client: PoolClient,
    input: { email: string; fullName: string; passwordHash: string },
  ): Promise<AuthUser> {
    const result = await client.query<{ id: string; email: string; full_name: string }>(
      `INSERT INTO users (email, full_name, password_hash)
       VALUES (lower($1), $2, $3)
       RETURNING id, email, full_name`,
      [input.email, input.fullName, input.passwordHash],
    );
    const row = result.rows[0]!;
    return { id: row.id, email: row.email, fullName: row.full_name };
  }

  async createTenant(
    client: PoolClient,
    input: {
      slug: string;
      name: string;
      defaultCurrency: string;
      timezone: string;
    },
  ): Promise<{ id: string; slug: string; name: string }> {
    const result = await client.query<{ id: string; slug: string; name: string }>(
      `INSERT INTO tenants (slug, name, default_currency, timezone)
       VALUES (lower($1), $2, $3, $4)
       RETURNING id, slug, name`,
      [input.slug, input.name, input.defaultCurrency, input.timezone],
    );
    const tenant = result.rows[0]!;
    await client.query(`INSERT INTO tenant_settings (tenant_id) VALUES ($1)`, [tenant.id]);
    return tenant;
  }

  async createShop(
    client: PoolClient,
    input: { tenantId: string; code: string; name: string; timezone: string },
  ): Promise<{ id: string }> {
    const result = await client.query<{ id: string }>(
      `INSERT INTO shops (tenant_id, code, name, timezone)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [input.tenantId, input.code, input.name, input.timezone],
    );
    return result.rows[0]!;
  }

  async seedSystemRoles(client: PoolClient, tenantId: string): Promise<Map<RoleCode, string>> {
    const permissionRows = await client.query<{ id: string; code: string }>(
      `SELECT id, code FROM permissions`,
    );
    const permissionIdByCode = new Map(permissionRows.rows.map((row) => [row.code, row.id]));
    const roleIds = new Map<RoleCode, string>();

    for (const code of ROLE_CODES) {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO roles (tenant_id, code, name, is_system)
         VALUES ($1, $2, $3, true)
         RETURNING id`,
        [tenantId, code, ROLE_DISPLAY_NAMES[code]],
      );
      const roleId = inserted.rows[0]!.id;
      roleIds.set(code, roleId);

      for (const permissionCode of ROLE_PERMISSION_MAP[code]) {
        const permissionId = permissionIdByCode.get(permissionCode);
        if (!permissionId) {
          throw new Error(`Missing permission seed: ${permissionCode}`);
        }
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)`,
          [roleId, permissionId],
        );
      }
    }

    return roleIds;
  }

  async createMembership(
    client: PoolClient,
    input: {
      tenantId: string;
      userId: string;
      defaultShopId: string | null;
      roleIds: string[];
    },
  ): Promise<string> {
    const result = await client.query<{ id: string }>(
      `INSERT INTO tenant_memberships (tenant_id, user_id, status, default_shop_id)
       VALUES ($1, $2, 'active', $3)
       RETURNING id`,
      [input.tenantId, input.userId, input.defaultShopId],
    );
    const membershipId = result.rows[0]!.id;
    for (const roleId of input.roleIds) {
      await client.query(`INSERT INTO membership_roles (membership_id, role_id) VALUES ($1, $2)`, [
        membershipId,
        roleId,
      ]);
    }
    return membershipId;
  }

  async listMembershipsForUser(
    client: PoolClient,
    userId: string,
  ): Promise<
    Array<{ membershipId: string; tenantId: string; tenantSlug: string; tenantName: string }>
  > {
    const result = await client.query<{
      membership_id: string;
      tenant_id: string;
      slug: string;
      name: string;
    }>(
      `SELECT m.id AS membership_id, t.id AS tenant_id, t.slug, t.name
       FROM tenant_memberships m
       INNER JOIN tenants t ON t.id = m.tenant_id
       WHERE m.user_id = $1 AND m.status = 'active' AND t.status = 'active'
       ORDER BY t.name ASC`,
      [userId],
    );
    return result.rows.map((row) => ({
      membershipId: row.membership_id,
      tenantId: row.tenant_id,
      tenantSlug: row.slug,
      tenantName: row.name,
    }));
  }

  async loadSession(
    client: PoolClient,
    input: { userId: string; tenantId: string },
  ): Promise<AuthSession | null> {
    const user = await this.findUserById(client, input.userId);
    if (!user) {
      return null;
    }

    const membership = await client.query<{
      id: string;
      default_shop_id: string | null;
      slug: string;
      name: string;
    }>(
      `SELECT m.id, m.default_shop_id, t.slug, t.name
       FROM tenant_memberships m
       INNER JOIN tenants t ON t.id = m.tenant_id
       WHERE m.user_id = $1 AND m.tenant_id = $2 AND m.status = 'active' AND t.status = 'active'
       LIMIT 1`,
      [input.userId, input.tenantId],
    );
    const membershipRow = membership.rows[0];
    if (!membershipRow) {
      return null;
    }

    const rolesResult = await client.query<{ code: string }>(
      `SELECT r.code
       FROM membership_roles mr
       INNER JOIN roles r ON r.id = mr.role_id
       WHERE mr.membership_id = $1`,
      [membershipRow.id],
    );
    const roles = rolesResult.rows.map((row) => row.code);

    const permissionsResult = await client.query<{ code: string }>(
      `SELECT DISTINCT p.code
       FROM membership_roles mr
       INNER JOIN role_permissions rp ON rp.role_id = mr.role_id
       INNER JOIN permissions p ON p.id = rp.permission_id
       WHERE mr.membership_id = $1
       ORDER BY p.code`,
      [membershipRow.id],
    );

    return {
      user,
      tenant: {
        id: input.tenantId,
        slug: membershipRow.slug,
        name: membershipRow.name,
      },
      membershipId: membershipRow.id,
      roles,
      permissions: permissionsResult.rows.map((row) => row.code),
      defaultShopId: membershipRow.default_shop_id,
    };
  }

  async storeRefreshToken(
    client: PoolClient,
    input: { userId: string; tenantId: string; tokenHash: string; expiresAt: Date },
  ): Promise<void> {
    await client.query(
      `INSERT INTO refresh_tokens (user_id, tenant_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [input.userId, input.tenantId, input.tokenHash, input.expiresAt],
    );
  }

  async findRefreshToken(
    client: PoolClient,
    tokenHash: string,
  ): Promise<{
    id: string;
    userId: string;
    tenantId: string;
    expiresAt: Date;
    revokedAt: Date | null;
  } | null> {
    const result = await client.query<{
      id: string;
      user_id: string;
      tenant_id: string;
      expires_at: Date;
      revoked_at: Date | null;
    }>(
      `SELECT id, user_id, tenant_id, expires_at, revoked_at
       FROM refresh_tokens WHERE token_hash = $1 LIMIT 1`,
      [tokenHash],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
    };
  }

  async revokeRefreshToken(client: PoolClient, tokenHash: string): Promise<void> {
    await client.query(
      `UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash],
    );
  }

  async listMembers(client: PoolClient, tenantId: string) {
    const result = await client.query<{
      membership_id: string;
      user_id: string;
      email: string;
      full_name: string;
      status: string;
      roles: string[] | null;
    }>(
      `SELECT m.id AS membership_id, u.id AS user_id, u.email, u.full_name, m.status,
              array_remove(array_agg(r.code), NULL) AS roles
       FROM tenant_memberships m
       INNER JOIN users u ON u.id = m.user_id
       LEFT JOIN membership_roles mr ON mr.membership_id = m.id
       LEFT JOIN roles r ON r.id = mr.role_id
       WHERE m.tenant_id = $1
       GROUP BY m.id, u.id, u.email, u.full_name, m.status
       ORDER BY u.email`,
      [tenantId],
    );
    return result.rows.map((row) => ({
      membershipId: row.membership_id,
      userId: row.user_id,
      email: row.email,
      fullName: row.full_name,
      status: row.status,
      roles: row.roles ?? [],
    }));
  }

  async findRoleIdsByCodes(
    client: PoolClient,
    tenantId: string,
    codes: string[],
  ): Promise<string[]> {
    const result = await client.query<{ id: string }>(
      `SELECT id FROM roles WHERE tenant_id = $1 AND code = ANY($2::text[])`,
      [tenantId, codes],
    );
    return result.rows.map((row) => row.id);
  }

  async updateMembershipRoles(
    client: PoolClient,
    membershipId: string,
    roleIds: string[],
  ): Promise<void> {
    await client.query(`DELETE FROM membership_roles WHERE membership_id = $1`, [membershipId]);
    for (const roleId of roleIds) {
      await client.query(`INSERT INTO membership_roles (membership_id, role_id) VALUES ($1, $2)`, [
        membershipId,
        roleId,
      ]);
    }
  }

  async updateMembershipStatus(
    client: PoolClient,
    membershipId: string,
    status: 'active' | 'disabled' | 'invited',
  ): Promise<void> {
    await client.query(
      `UPDATE tenant_memberships SET status = $2, updated_at = now() WHERE id = $1`,
      [membershipId, status],
    );
  }

  async getMembershipTenantId(client: PoolClient, membershipId: string): Promise<string | null> {
    const result = await client.query<{ tenant_id: string }>(
      `SELECT tenant_id FROM tenant_memberships WHERE id = $1`,
      [membershipId],
    );
    return result.rows[0]?.tenant_id ?? null;
  }

  async listRoles(client: PoolClient, tenantId: string) {
    const roles = await client.query<{
      id: string;
      code: string;
      name: string;
      is_system: boolean;
    }>(`SELECT id, code, name, is_system FROM roles WHERE tenant_id = $1 ORDER BY code`, [
      tenantId,
    ]);

    const result = [];
    for (const role of roles.rows) {
      const permissions = await client.query<{ code: string }>(
        `SELECT p.code
         FROM role_permissions rp
         INNER JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = $1
         ORDER BY p.code`,
        [role.id],
      );
      result.push({
        id: role.id,
        code: role.code,
        name: role.name,
        isSystem: role.is_system,
        permissions: permissions.rows.map((row) => row.code),
      });
    }
    return result;
  }

  async slugExists(client: PoolClient, slug: string): Promise<boolean> {
    const result = await client.query(`SELECT 1 FROM tenants WHERE slug = lower($1) LIMIT 1`, [
      slug,
    ]);
    return (result.rowCount ?? 0) > 0;
  }
}
