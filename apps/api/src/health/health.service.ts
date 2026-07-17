import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { createClient } from 'redis';

import { API_VERSION, type HealthResponse, type ReadyHealthResponse } from '@3d-print-os/contracts';
import { checkDatabaseConnectivity } from '@3d-print-os/persistence';

import type { AppConfig } from '../config/configuration';
import { APP_CONFIG, DATABASE_POOL } from '../config/tokens';

@Injectable()
export class HealthService {
  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  getLiveness(): HealthResponse {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    };
  }

  getVersion(): { api_version: typeof API_VERSION } {
    return { api_version: API_VERSION };
  }

  async getReadiness(): Promise<ReadyHealthResponse> {
    const databaseUp = await checkDatabaseConnectivity(this.pool);
    const redisStatus = await this.checkRedis();

    const degraded = !databaseUp || (redisStatus === 'down' && this.config.redisUrl !== undefined);

    return {
      status: degraded ? 'degraded' : 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
      checks: {
        database: databaseUp ? 'up' : 'down',
        redis: redisStatus,
      },
    };
  }

  private async checkRedis(): Promise<'up' | 'down' | 'skipped'> {
    if (!this.config.redisUrl) {
      return 'skipped';
    }

    const client = createClient({
      url: this.config.redisUrl,
      socket: {
        connectTimeout: 2_000,
        reconnectStrategy: false,
      },
    });

    try {
      await Promise.race([
        client.connect(),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('redis connect timeout')), 2_500);
        }),
      ]);
      const pong = await client.ping();
      return pong === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    } finally {
      try {
        if (client.isOpen) {
          await client.quit();
        }
      } catch {
        // ignore quit errors
      }
    }
  }
}
