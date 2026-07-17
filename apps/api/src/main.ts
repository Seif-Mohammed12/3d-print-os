import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { config as loadDotenv } from 'dotenv';
import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { createLogger } from '@3d-print-os/observability';

import { AppModule } from './app.module';
import { loadAppConfig } from './config/configuration';
import { requestIdMiddleware } from './shared/middleware/request-id.middleware';
import { createValidationPipe } from './shared/pipes/create-validation-pipe';

function loadEnvFiles(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
    resolve(__dirname, '../../../.env'),
  ];

  for (const file of candidates) {
    if (existsSync(file)) {
      loadDotenv({ path: file });
      return;
    }
  }

  loadDotenv();
}

async function bootstrap(): Promise<void> {
  loadEnvFiles();

  const config = loadAppConfig();
  const logger = createLogger({ service: 'api', level: config.logLevel });

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.setGlobalPrefix('api/v1');
  app.use(requestIdMiddleware);
  app.use(
    helmet({
      contentSecurityPolicy: config.nodeEnv === 'production',
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
  });
  app.useGlobalPipes(createValidationPipe());

  await app.listen(config.port);
  logger.info(
    {
      port: config.port,
      api_prefix: 'api/v1',
      node_env: config.nodeEnv,
    },
    'API listening',
  );
}

void bootstrap();
