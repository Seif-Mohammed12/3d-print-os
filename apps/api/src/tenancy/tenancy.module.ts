import { Module } from '@nestjs/common';
import type { Pool } from 'pg';

import { TenancyRepository, TenancyService } from '@3d-print-os/tenancy';

import { DATABASE_POOL } from '../config/tokens';
import { TENANCY_REPOSITORY, TENANCY_SERVICE } from '../identity/identity.tokens';
import { TenancyController } from './tenancy.controller';

@Module({
  controllers: [TenancyController],
  providers: [
    {
      provide: TENANCY_REPOSITORY,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new TenancyRepository(pool),
    },
    {
      provide: TENANCY_SERVICE,
      inject: [TENANCY_REPOSITORY],
      useFactory: (repo: TenancyRepository) => new TenancyService(repo),
    },
  ],
  exports: [TENANCY_SERVICE],
})
export class TenancyModule {}
