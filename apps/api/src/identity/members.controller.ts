import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';

import { AuthDomainError, type MembersService } from '@3d-print-os/identity';

import { AppError } from '../shared/errors/app.error';
import { CurrentAuth, RequirePermissions } from './auth.decorators';
import type { RequestAuthContext } from './auth.types';
import { InviteMemberDto, UpdateMemberDto } from './dto/auth.dto';
import { MEMBERS_SERVICE } from './identity.tokens';

function mapError(error: unknown): never {
  if (error instanceof AuthDomainError) {
    throw new AppError({
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
    });
  }
  throw error;
}

@Controller()
export class MembersController {
  constructor(@Inject(MEMBERS_SERVICE) private readonly membersService: MembersService) {}

  @Get('members')
  @RequirePermissions('members:read')
  async list(@CurrentAuth() auth: RequestAuthContext) {
    try {
      const members = await this.membersService.list(auth.tenantId);
      return {
        data: members.map((member) => ({
          membership_id: member.membershipId,
          user_id: member.userId,
          email: member.email,
          full_name: member.fullName,
          status: member.status,
          roles: member.roles,
        })),
      };
    } catch (error) {
      mapError(error);
    }
  }

  @Post('members/invite')
  @RequirePermissions('members:manage')
  async invite(@CurrentAuth() auth: RequestAuthContext, @Body() body: InviteMemberDto) {
    try {
      const result = await this.membersService.invite(auth.tenantId, {
        email: body.email,
        fullName: body.fullName,
        password: body.password,
        roleCodes: body.roleCodes,
      });
      return {
        data: {
          membership_id: result.membershipId,
          user_id: result.userId,
        },
      };
    } catch (error) {
      mapError(error);
    }
  }

  @Patch('members/:id')
  @RequirePermissions('members:manage')
  async update(
    @CurrentAuth() auth: RequestAuthContext,
    @Param('id') membershipId: string,
    @Body() body: UpdateMemberDto,
  ) {
    try {
      await this.membersService.updateMember(auth.tenantId, membershipId, {
        ...(body.roleCodes !== undefined ? { roleCodes: body.roleCodes } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      });
      return { data: { membership_id: membershipId } };
    } catch (error) {
      mapError(error);
    }
  }

  @Get('roles')
  @RequirePermissions('roles:read')
  async roles(@CurrentAuth() auth: RequestAuthContext) {
    try {
      const roles = await this.membersService.listRoles(auth.tenantId);
      return {
        data: roles.map((role) => ({
          id: role.id,
          code: role.code,
          name: role.name,
          is_system: role.isSystem,
          permissions: role.permissions,
        })),
      };
    } catch (error) {
      mapError(error);
    }
  }
}
