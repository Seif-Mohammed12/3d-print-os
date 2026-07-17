import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { createLogger } from '@3d-print-os/observability';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = createLogger({ service: 'api' });
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.setGlobalPrefix('api/v1');

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
  logger.info({ port }, 'API listening');
}

void bootstrap();
