import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import type { Pool } from 'pg';

import { AuthService, IdentityRepository, MembersService } from '@3d-print-os/identity';

import type { AppConfig } from '../config/configuration';
import { APP_CONFIG, DATABASE_POOL } from '../config/tokens';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtTokenIssuer } from './jwt-token.issuer';
import { MembersController } from './members.controller';
import { PermissionsGuard } from './permissions.guard';
import { AUTH_SERVICE, IDENTITY_REPOSITORY, MEMBERS_SERVICE } from './identity.tokens';

@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, MembersController],
  providers: [
    JwtTokenIssuer,
    {
      provide: IDENTITY_REPOSITORY,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new IdentityRepository(pool),
    },
    {
      provide: AUTH_SERVICE,
      inject: [IDENTITY_REPOSITORY, JwtTokenIssuer, APP_CONFIG],
      useFactory: (repo: IdentityRepository, tokens: JwtTokenIssuer, config: AppConfig) =>
        new AuthService(repo, tokens, config.jwtRefreshTtlDays),
    },
    {
      provide: MEMBERS_SERVICE,
      inject: [IDENTITY_REPOSITORY],
      useFactory: (repo: IdentityRepository) => new MembersService(repo),
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
  exports: [AUTH_SERVICE, MEMBERS_SERVICE, JwtTokenIssuer],
})
export class IdentityModule {}
