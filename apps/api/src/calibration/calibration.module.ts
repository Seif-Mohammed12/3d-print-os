import { Module } from '@nestjs/common';
import type { Pool } from 'pg';

import { DATABASE_POOL } from '../config/tokens';
import { CalibrationController } from './calibration.controller';
import { CalibrationRepository } from './calibration.repository';
import { CalibrationService } from './calibration.service';

@Module({
  controllers: [CalibrationController],
  providers: [
    {
      provide: CalibrationService,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new CalibrationService(new CalibrationRepository(pool)),
    },
  ],
  exports: [CalibrationService],
})
export class CalibrationModule {}
