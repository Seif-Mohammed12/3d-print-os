import {
  Global,
  Inject,
  Injectable,
  type OnModuleDestroy,
  Module,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { Pool } from 'pg';

import { checkDatabaseConnectivity, createDatabasePool } from '@3d-print-os/persistence';
import { createLogger } from '@3d-print-os/observability';

import { loadAppConfig, type AppConfig } from '../../config/configuration';
import { APP_CONFIG, DATABASE_POOL } from '../../config/tokens';

const logger = createLogger({ service: 'api-persistence' });

@Injectable()
class DatabasePoolLifecycle implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async onModuleInit(): Promise<void> {
    const healthy = await checkDatabaseConnectivity(this.pool);
    if (healthy) {
      logger.info('Database connectivity verified');
      return;
    }

    if (this.config.dbRequiredOnBoot) {
      throw new Error('Database is required on boot but connectivity check failed');
    }

    logger.warn('Database connectivity check failed — API will continue; /health/ready degraded');
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: (): AppConfig => loadAppConfig(),
    },
    {
      provide: DATABASE_POOL,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): Pool =>
        createDatabasePool({
          connectionString: config.databaseUrl,
          max: config.dbPoolMax,
        }),
    },
    DatabasePoolLifecycle,
  ],
  exports: [APP_CONFIG, DATABASE_POOL],
})
export class PersistenceModule {}

/** Re-export for consumers that need ConfigService typing helpers. */
export { ConfigService };
