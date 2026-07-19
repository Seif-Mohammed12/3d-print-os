import { Module } from '@nestjs/common';
import type { Pool } from 'pg';

import { PrinterRepository } from './repositories/printer.repository';
import { PrintersController } from './printers.controller';
import { PrinterService } from './services/printer.service';
import { DATABASE_POOL } from '../config/tokens';

@Module({
  controllers: [PrintersController],
  providers: [
    {
      provide: 'PRINTER_REPOSITORY',
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new PrinterRepository(pool),
    },
    {
      provide: PrinterService,
      inject: ['PRINTER_REPOSITORY'],
      useFactory: (repo: PrinterRepository) => new PrinterService(repo),
    },
  ],
  exports: [PrinterService],
})
export class PrintersModule {}
