import type { IdentityRepository } from '../infrastructure/identity.repository';
import { AuthDomainError } from './auth.service';

export class MembersService {
  constructor(private readonly repo: IdentityRepository) {}

  list(tenantId: string) {
    return this.repo.withTenant(tenantId, (client) => this.repo.listMembers(client, tenantId));
  }

  async invite(
    tenantId: string,
    input: {
      email: string;
      fullName: string;
      password: string;
      roleCodes: string[];
    },
  ) {
    if (input.roleCodes.length === 0) {
      throw new AuthDomainError('At least one role is required', 'members.roles_required', 400);
    }
    if (input.password.length < 8) {
      throw new AuthDomainError(
        'Password must be at least 8 characters',
        'auth.weak_password',
        400,
      );
    }

    const argon2 = await import('argon2');

    return this.repo.withBypass(async (client) => {
      let user = await this.repo.findUserByEmail(client, input.email);
      if (!user) {
        const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
        const created = await this.repo.createUser(client, {
          email: input.email,
          fullName: input.fullName,
          passwordHash,
        });
        user = { ...created, passwordHash };
      }

      const roleIds = await this.repo.findRoleIdsByCodes(client, tenantId, input.roleCodes);
      if (roleIds.length !== input.roleCodes.length) {
        throw new AuthDomainError('One or more roles are invalid', 'members.invalid_roles', 400);
      }

      try {
        const membershipId = await this.repo.createMembership(client, {
          tenantId,
          userId: user.id,
          defaultShopId: null,
          roleIds,
        });
        return { membershipId, userId: user.id };
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.includes('tenant_memberships') || message.includes('unique')) {
          throw new AuthDomainError(
            'User is already a member of this tenant',
            'members.exists',
            409,
          );
        }
        throw error;
      }
    });
  }

  async updateMember(
    tenantId: string,
    membershipId: string,
    input: { roleCodes?: string[]; status?: 'active' | 'disabled' | 'invited' },
  ) {
    return this.repo.withTenant(tenantId, async (client) => {
      const membershipTenantId = await this.repo.getMembershipTenantId(client, membershipId);
      if (!membershipTenantId || membershipTenantId !== tenantId) {
        throw new AuthDomainError('Membership not found', 'members.not_found', 404);
      }

      if (input.roleCodes) {
        const roleIds = await this.repo.findRoleIdsByCodes(client, tenantId, input.roleCodes);
        if (roleIds.length !== input.roleCodes.length) {
          throw new AuthDomainError('One or more roles are invalid', 'members.invalid_roles', 400);
        }
        await this.repo.updateMembershipRoles(client, membershipId, roleIds);
      }

      if (input.status) {
        await this.repo.updateMembershipStatus(client, membershipId, input.status);
      }

      return { membershipId };
    });
  }

  listRoles(tenantId: string) {
    return this.repo.withTenant(tenantId, (client) => this.repo.listRoles(client, tenantId));
  }
}
