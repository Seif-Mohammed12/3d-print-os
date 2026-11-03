import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { config as loadDotenv } from 'dotenv';
import 'reflect-metadata';

import type {
  CorsOptions,
  CorsOptionsDelegate,
} from '@nestjs/common/interfaces/external/cors-options.interface';
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
  // The website quoter's API is called from shops' own sites. Its CORS answer can't depend on
  // the shop (that needs a database lookup), so it admits any origin without credentials and
  // EmbedService refuses origins that aren't on the shop's allowed list.
  const cors: CorsOptionsDelegate<{ url?: string }> = (req, callback) => {
    if (req.url?.startsWith('/api/v1/public/embed/')) {
      callback(null, {
        origin: true,
        credentials: false,
        allowedHeaders: ['Content-Type', 'X-Embed-Session'],
        methods: ['GET', 'POST'],
        maxAge: 600,
      });
      return;
    }
    callback(null, { origin: config.corsOrigins, credentials: true } satisfies CorsOptions);
  };
  app.enableCors(cors);
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
