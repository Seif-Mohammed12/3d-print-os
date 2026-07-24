import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { DATABASE_POOL } from '../config/tokens';

@Module({
  controllers: [PortalController],
  providers: [
    {
      provide: PortalService,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new PortalService(pool),
    },
  ],
  exports: [PortalService],
})
export class PortalModule {}
