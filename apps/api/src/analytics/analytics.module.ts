import { Module } from '@nestjs/common';
import type { Pool } from 'pg';

import { AnalyticsRepository } from './repositories/analytics.repository';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { DATABASE_POOL } from '../config/tokens';

@Module({
  controllers: [AnalyticsController],
  providers: [
    {
      provide: 'ANALYTICS_REPOSITORY',
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new AnalyticsRepository(pool),
    },
    {
      provide: AnalyticsService,
      inject: ['ANALYTICS_REPOSITORY'],
      useFactory: (repo: AnalyticsRepository) => new AnalyticsService(repo),
    },
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
