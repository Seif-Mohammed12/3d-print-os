import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import type { Pool } from 'pg';

import { QuoteRepository } from './repositories/quote.repository';
import { QuotesController } from './quotes.controller';
import { QuoteService } from './services/quote.service';
import { GeometryIntegrationService } from './services/geometry-integration.service';
import { PricingIntegrationService } from './services/pricing-integration.service';
import { DATABASE_POOL } from '../config/tokens';

@Module({
  imports: [HttpModule],
  controllers: [QuotesController],
  providers: [
    {
      provide: 'QUOTE_REPOSITORY',
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new QuoteRepository(pool),
    },
    {
      provide: QuoteService,
      inject: ['QUOTE_REPOSITORY', GeometryIntegrationService, PricingIntegrationService],
      useFactory: (
        repo: QuoteRepository,
        geometryService: GeometryIntegrationService,
        pricingService: PricingIntegrationService,
      ) => new QuoteService(repo, geometryService, pricingService),
    },
    GeometryIntegrationService,
    PricingIntegrationService,
  ],
  exports: [QuoteService, GeometryIntegrationService, PricingIntegrationService],
})
export class QuotesModule {}
