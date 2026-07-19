import { Module } from '@nestjs/common';
import type { Pool } from 'pg';

import { MaterialRepository } from './repositories/material.repository';
import { MaterialsController } from './materials.controller';
import { MaterialService } from './services/material.service';
import { DATABASE_POOL } from '../config/tokens';

@Module({
  controllers: [MaterialsController],
  providers: [
    {
      provide: 'MATERIAL_REPOSITORY',
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new MaterialRepository(pool),
    },
    {
      provide: MaterialService,
      inject: ['MATERIAL_REPOSITORY'],
      useFactory: (repo: MaterialRepository) => new MaterialService(repo),
    },
  ],
  exports: [MaterialService],
})
export class MaterialsModule {}
