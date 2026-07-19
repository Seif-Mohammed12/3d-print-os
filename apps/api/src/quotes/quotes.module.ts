import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import type { Pool } from 'pg';

import { QuoteRepository } from './repositories/quote.repository';
import { QuotesController } from './quotes.controller';
import { QuoteService } from './services/quote.service';
import { GeometryIntegrationService } from './services/geometry-integration.service';
import { PricingIntegrationService } from './services/pricing-integration.service';
import { DATABASE_POOL } from '../config/tokens';
import { MaterialsModule } from '../materials/materials.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [HttpModule, MaterialsModule, OrdersModule],
  controllers: [QuotesController],
  providers: [
    {
      provide: 'QUOTE_REPOSITORY',
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new QuoteRepository(pool),
    },
    {
      provide: QuoteService,
      inject: [
        'QUOTE_REPOSITORY',
        GeometryIntegrationService,
        PricingIntegrationService,
        'ORDER_SERVICE',
      ],
      useFactory: (
        repo: QuoteRepository,
        geometryService: GeometryIntegrationService,
        pricingService: PricingIntegrationService,
        orderService: any,
      ) => new QuoteService(repo, geometryService, pricingService, orderService),
    },
    GeometryIntegrationService,
    PricingIntegrationService,
  ],
  exports: [QuoteService, GeometryIntegrationService, PricingIntegrationService],
})
export class QuotesModule {}
