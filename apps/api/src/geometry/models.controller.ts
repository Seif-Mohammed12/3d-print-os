import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post } from '@nestjs/common';

import {
  GeometryDomainError,
  type ModelFile,
  type ModelUploadService,
} from '@3d-print-os/geometry';

import { CurrentAuth, CustomerAccess, RequirePermissions } from '../identity/auth.decorators';
import type { RequestAuthContext } from '../identity/auth.types';
import { isCustomerOnly } from '../identity/customer-boundary.guard';
import { AppError } from '../shared/errors/app.error';
import { CompleteModelUploadDto, StartModelUploadDto } from './dto/models.dto';
import { MODEL_UPLOAD_SERVICE } from './geometry.tokens';

function mapError(error: unknown): never {
  if (error instanceof GeometryDomainError) {
    throw new AppError({
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
    });
  }
  throw error;
}

function serializeModel(model: ModelFile) {
  return {
    id: model.id,
    filename: model.originalFilename,
    user_id: model.uploadedByUserId,
    shop_id: model.shopId,
    byte_size: model.byteSize,
    content_type: model.contentType,
    status: model.status,
    storage_location: `${model.storageBucket}/${model.storageKey}`,
    checksum_sha256: model.checksumSha256,
    upload_date: model.createdAt.toISOString(),
    updated_at: model.updatedAt.toISOString(),
  };
}

@Controller('models')
export class ModelsController {
  constructor(@Inject(MODEL_UPLOAD_SERVICE) private readonly uploads: ModelUploadService) {}

  @Post('uploads')
  @RequirePermissions('models:write')
  @CustomerAccess()
  async startUpload(@CurrentAuth() auth: RequestAuthContext, @Body() body: StartModelUploadDto) {
    try {
      const result = await this.uploads.startUpload({
        tenantId: auth.tenantId,
        userId: auth.userId,
        originalFilename: body.filename,
        byteSize: body.byteSize,
        ...(body.contentType !== undefined ? { contentType: body.contentType } : {}),
        ...(body.shopId !== undefined ? { shopId: body.shopId } : {}),
      });

      return {
        data: {
          model: serializeModel(result.model),
          upload: {
            method: result.upload.method,
            url: result.upload.url,
            token: result.upload.token ?? null,
            headers: result.upload.headers,
            expires_in: result.upload.expiresInSeconds,
          },
        },
      };
    } catch (error) {
      mapError(error);
    }
  }

  @Post(':id/complete')
  @RequirePermissions('models:write')
  @CustomerAccess()
  async complete(
    @CurrentAuth() auth: RequestAuthContext,
    @Param('id') modelId: string,
    @Body() body: CompleteModelUploadDto,
  ) {
    try {
      // Customers share the shop's tenant, so they may only finish their own uploads.
      if (isCustomerOnly(auth)) {
        const existing = await this.uploads.getModel(auth.tenantId, modelId);
        if (existing.uploadedByUserId !== auth.userId) {
          throw new AppError({
            code: 'model.not_found',
            message: 'Model not found',
            statusCode: 404,
          });
        }
      }
      const model = await this.uploads.completeUpload(auth.tenantId, modelId, body.checksumSha256);
      return { data: serializeModel(model) };
    } catch (error) {
      mapError(error);
    }
  }

  @Get(':id')
  @RequirePermissions('models:read')
  async getStatus(@CurrentAuth() auth: RequestAuthContext, @Param('id') modelId: string) {
    try {
      const model = await this.uploads.getModel(auth.tenantId, modelId);
      return { data: serializeModel(model) };
    } catch (error) {
      mapError(error);
    }
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('models:write')
  async remove(@CurrentAuth() auth: RequestAuthContext, @Param('id') modelId: string) {
    try {
      await this.uploads.deleteModel(auth.tenantId, modelId);
    } catch (error) {
      mapError(error);
    }
  }
}
