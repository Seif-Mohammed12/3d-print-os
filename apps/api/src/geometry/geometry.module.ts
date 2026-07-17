import { Module } from '@nestjs/common';
import type { Pool } from 'pg';

import { ModelFilesRepository, ModelUploadService } from '@3d-print-os/geometry';
import { SupabaseObjectStorage } from '@3d-print-os/storage';

import type { AppConfig } from '../config/configuration';
import { APP_CONFIG, DATABASE_POOL } from '../config/tokens';
import { MODEL_FILES_REPOSITORY, MODEL_UPLOAD_SERVICE, OBJECT_STORAGE } from './geometry.tokens';
import { ModelsController } from './models.controller';

@Module({
  controllers: [ModelsController],
  providers: [
    {
      provide: OBJECT_STORAGE,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        new SupabaseObjectStorage({
          url: config.supabaseUrl,
          serviceRoleKey: config.supabaseServiceRoleKey,
        }),
    },
    {
      provide: MODEL_FILES_REPOSITORY,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new ModelFilesRepository(pool),
    },
    {
      provide: MODEL_UPLOAD_SERVICE,
      inject: [MODEL_FILES_REPOSITORY, OBJECT_STORAGE, APP_CONFIG],
      useFactory: (repo: ModelFilesRepository, storage: SupabaseObjectStorage, config: AppConfig) =>
        new ModelUploadService(repo, storage, {
          bucket: config.uploadBucket,
          maxBytes: config.uploadMaxBytes,
          signedUrlTtlSeconds: config.uploadSignedUrlTtlSeconds,
        }),
    },
  ],
})
export class GeometryModule {}
