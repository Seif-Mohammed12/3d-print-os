import { Module } from '@nestjs/common';
import type { Pool } from 'pg';

import { DATABASE_POOL } from '../config/tokens';
import { QuotesModule } from '../quotes/quotes.module';
import { QuoteService } from '../quotes/services/quote.service';
import { PortalController } from './portal.controller';
import { PortalRepository } from './portal.repository';
import { PortalService } from './portal.service';
import { PortalSettingsController } from './portal-settings.controller';

@Module({
  imports: [QuotesModule],
  controllers: [PortalController, PortalSettingsController],
  providers: [
    {
      provide: PortalRepository,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new PortalRepository(pool),
    },
    {
      provide: PortalService,
      inject: [PortalRepository, QuoteService],
      useFactory: (repo: PortalRepository, quotes: QuoteService) => new PortalService(repo, quotes),
    },
  ],
  exports: [PortalService],
})
export class PortalModule {}
