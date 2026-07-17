import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { createLogger } from '@3d-print-os/observability';

import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  const logger = createLogger({ service: 'worker' });
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['error', 'warn', 'log'],
  });

  logger.info('Worker application context started (no job processors yet)');

  const shutdown = async (): Promise<void> => {
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

void bootstrap();
