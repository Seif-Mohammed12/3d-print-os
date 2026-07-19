import { Module } from '@nestjs/common';
import type { Pool } from 'pg';

import { PricingRepository } from './repositories/pricing.repository';
import { PricingController } from './pricing.controller';
import { PricingService } from './services/pricing.service';
import { DATABASE_POOL } from '../config/tokens';

@Module({
  controllers: [PricingController],
  providers: [
    {
      provide: 'PRICING_REPOSITORY',
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new PricingRepository(pool),
    },
    {
      provide: PricingService,
      inject: ['PRICING_REPOSITORY'],
      useFactory: (repo: PricingRepository) => new PricingService(repo),
    },
  ],
  exports: [PricingService],
})
export class PricingModule {}
