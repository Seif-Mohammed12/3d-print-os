import { randomUUID } from 'node:crypto';

import type { ObjectStoragePort } from '@3d-print-os/storage';

import { assertStlUpload, buildStorageKey, GeometryDomainError } from '../domain/validation';
import type { CreateModelUploadInput, ModelFile } from '../domain/types';
import type { ModelFilesRepository } from '../infrastructure/model-files.repository';

export type ModelUploadResult = {
  model: ModelFile;
  upload: {
    method: 'PUT';
    url: string;
    token?: string;
    headers: Record<string, string>;
    expiresInSeconds: number;
  };
};

export class ModelUploadService {
  constructor(
    private readonly repo: ModelFilesRepository,
    private readonly storage: ObjectStoragePort,
    private readonly options: {
      bucket: string;
      maxBytes: number;
      signedUrlTtlSeconds: number;
    },
  ) {}

  async startUpload(input: CreateModelUploadInput): Promise<ModelUploadResult> {
    const { safeFilename, contentType } = assertStlUpload({
      originalFilename: input.originalFilename,
      byteSize: input.byteSize,
      maxBytes: this.options.maxBytes,
      ...(input.contentType !== undefined ? { contentType: input.contentType } : {}),
    });

    const modelId = randomUUID();
    const storageKey = buildStorageKey(input.tenantId, modelId);

    const model = await this.repo.withTenant(input.tenantId, async (client) => {
      if (input.shopId) {
        const ok = await this.repo.shopExists(client, input.tenantId, input.shopId);
        if (!ok) {
          throw new GeometryDomainError('Shop not found', 'shop.not_found', 404);
        }
      }

      return this.repo.create(client, {
        id: modelId,
        tenantId: input.tenantId,
        userId: input.userId,
        shopId: input.shopId ?? null,
        originalFilename: safeFilename,
        byteSize: input.byteSize,
        contentType,
        storageBucket: this.options.bucket,
        storageKey,
      });
    });

    try {
      const signed = await this.storage.createSignedUpload({
        bucket: this.options.bucket,
        key: storageKey,
        contentType,
        expiresInSeconds: this.options.signedUrlTtlSeconds,
      });

      return {
        model,
        upload: {
          method: 'PUT',
          url: signed.uploadUrl,
          ...(signed.token !== undefined ? { token: signed.token } : {}),
          headers: signed.headers,
          expiresInSeconds: signed.expiresInSeconds,
        },
      };
    } catch (error) {
      await this.repo.withTenant(input.tenantId, (client) =>
        this.repo.markFailed(client, input.tenantId, model.id),
      );
      throw new GeometryDomainError(
        error instanceof Error ? error.message : 'Failed to create upload URL',
        'models.storage_error',
        503,
      );
    }
  }

  async completeUpload(
    tenantId: string,
    modelId: string,
    checksumSha256?: string,
  ): Promise<ModelFile> {
    const existing = await this.repo.withTenant(tenantId, (client) =>
      this.repo.findById(client, tenantId, modelId),
    );

    if (!existing || existing.status === 'deleted') {
      throw new GeometryDomainError('Model not found', 'models.not_found', 404);
    }

    if (existing.status === 'uploaded') {
      return existing;
    }

    if (existing.status !== 'pending_upload') {
      throw new GeometryDomainError('Model cannot be completed', 'models.invalid_status', 409);
    }

    const exists = await this.storage.objectExists({
      bucket: existing.storageBucket,
      key: existing.storageKey,
    });
    if (!exists) {
      throw new GeometryDomainError(
        'Uploaded object not found in storage',
        'models.upload_missing',
        400,
      );
    }

    const updated = await this.repo.withTenant(tenantId, (client) =>
      this.repo.markUploaded(client, tenantId, modelId, checksumSha256),
    );
    if (!updated) {
      throw new GeometryDomainError('Model cannot be completed', 'models.invalid_status', 409);
    }
    return updated;
  }

  async getModel(tenantId: string, modelId: string): Promise<ModelFile> {
    const model = await this.repo.withTenant(tenantId, (client) =>
      this.repo.findById(client, tenantId, modelId),
    );
    if (!model || model.status === 'deleted') {
      throw new GeometryDomainError('Model not found', 'models.not_found', 404);
    }
    return model;
  }

  async deleteModel(tenantId: string, modelId: string): Promise<void> {
    const deleted = await this.repo.withTenant(tenantId, (client) =>
      this.repo.softDelete(client, tenantId, modelId),
    );
    if (!deleted) {
      throw new GeometryDomainError('Model not found', 'models.not_found', 404);
    }

    try {
      await this.storage.removeObject({
        bucket: deleted.storageBucket,
        key: deleted.storageKey,
      });
    } catch {
      // Metadata already deleted; storage cleanup can be retried by ops jobs later.
    }
  }
}
