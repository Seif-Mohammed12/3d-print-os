import { Module } from '@nestjs/common';
import type { Pool } from 'pg';

import { MLRepository } from './repositories/ml.repository';
import { MLController } from './ml.controller';
import { MLService } from './services/ml.service';
import { DATABASE_POOL } from '../config/tokens';

@Module({
  controllers: [MLController],
  providers: [
    {
      provide: 'ML_REPOSITORY',
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new MLRepository(pool),
    },
    {
      provide: MLService,
      inject: ['ML_REPOSITORY'],
      useFactory: (repo: MLRepository) => new MLService(repo),
    },
  ],
  exports: [MLService],
})
export class MLModule {}
