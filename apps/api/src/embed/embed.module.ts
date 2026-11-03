import { Module } from '@nestjs/common';
import type { Pool } from 'pg';

import type { ModelUploadService } from '@3d-print-os/geometry';

import type { AppConfig } from '../config/configuration';
import { APP_CONFIG, DATABASE_POOL } from '../config/tokens';
import { GeometryModule } from '../geometry/geometry.module';
import { MODEL_UPLOAD_SERVICE } from '../geometry/geometry.tokens';
import { PortalModule } from '../portal/portal.module';
import { PortalRepository } from '../portal/portal.repository';
import { QuotesModule } from '../quotes/quotes.module';
import { QuoteService } from '../quotes/services/quote.service';
import { EmbedPublicController } from './embed-public.controller';
import { EmbedSessionGuard } from './embed-session.guard';
import { EmbedSettingsController } from './embed-settings.controller';
import { EmbedRepository } from './embed.repository';
import { EmbedService } from './embed.service';

@Module({
  imports: [QuotesModule, PortalModule, GeometryModule],
  controllers: [EmbedPublicController, EmbedSettingsController],
  providers: [
    {
      provide: EmbedRepository,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new EmbedRepository(pool),
    },
    {
      provide: EmbedService,
      inject: [EmbedRepository, PortalRepository, QuoteService, MODEL_UPLOAD_SERVICE, APP_CONFIG],
      useFactory: (
        repo: EmbedRepository,
        portalRepo: PortalRepository,
        quotes: QuoteService,
        uploads: ModelUploadService,
        config: AppConfig,
      ) =>
        new EmbedService(repo, portalRepo, quotes, uploads, {
          frameOrigins: config.corsOrigins,
          uploadMaxBytes: Math.min(config.embedUploadMaxBytes, config.uploadMaxBytes),
        }),
    },
    EmbedSessionGuard,
  ],
})
export class EmbedModule {}
