import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { CurrentAuth } from '../identity/auth.decorators';
import type { RequestAuthContext } from '../identity/auth.types';
import type { DatasetExport, FeatureVector, TrainingSample } from './repositories/ml.repository';
import { MLService } from './services/ml.service';

type CreateTrainingSampleBody = Omit<
  TrainingSample,
  'id' | 'tenant_id' | 'created_at' | 'updated_at'
>;
type CreateFeatureVectorBody = Omit<FeatureVector, 'id' | 'created_at'>;
type CreateDatasetExportBody = Omit<
  DatasetExport,
  'id' | 'tenant_id' | 'created_at' | 'completed_at'
>;
type ExportDatasetBody = {
  shopId?: string;
  exportType: string;
  startDate?: string;
  endDate?: string;
};

@Controller('ml')
export class MLController {
  constructor(private mlService: MLService) {}

  @Post('training-samples')
  async createTrainingSample(
    @Body() data: CreateTrainingSampleBody,
    @CurrentAuth() auth?: RequestAuthContext,
  ) {
    const sample = await this.mlService.createTrainingSample({
      ...data,
      tenant_id: auth?.tenantId ?? '',
    });
    return { data: sample };
  }

  @Post('feature-vectors')
  async createFeatureVector(
    @Body() data: CreateFeatureVectorBody,
    @CurrentAuth() auth?: RequestAuthContext,
  ) {
    const vector = await this.mlService.createFeatureVector(data, auth?.tenantId ?? '');
    return { data: vector };
  }

  @Post('dataset-exports')
  async createDatasetExport(
    @Body() data: CreateDatasetExportBody,
    @CurrentAuth() auth?: RequestAuthContext,
  ) {
    const datasetExport = await this.mlService.createDatasetExport({
      ...data,
      tenant_id: auth?.tenantId ?? '',
    });
    return { data: datasetExport };
  }

  @Post('dataset-exports/:id/export')
  async exportDataset(
    @Param('id') id: string,
    @Body() data: ExportDatasetBody,
    @CurrentAuth() auth?: RequestAuthContext,
  ) {
    const datasetExport = await this.mlService.exportDatasetToCSV(
      auth?.tenantId ?? '',
      data.shopId,
      data.exportType,
      data.startDate ? new Date(data.startDate) : undefined,
      data.endDate ? new Date(data.endDate) : undefined,
    );
    return { data: datasetExport };
  }

  @Get('training-samples')
  async getTrainingSamples(
    @Query('shopId') shopId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('exportType') exportType?: string,
    @CurrentAuth() auth?: RequestAuthContext,
  ) {
    const samples = await this.mlService.getTrainingSamples(
      auth?.tenantId ?? '',
      shopId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      exportType,
    );
    return { data: samples };
  }

  @Get('dataset-exports')
  async getDatasetExports(
    @Query('shopId') shopId?: string,
    @CurrentAuth() auth?: RequestAuthContext,
  ) {
    const exports = await this.mlService.getDatasetExports(auth?.tenantId ?? '', shopId);
    return { data: exports };
  }

  @Get('model-performances')
  async getModelPerformances(
    @Query('shopId') shopId?: string,
    @CurrentAuth() auth?: RequestAuthContext,
  ) {
    const performances = await this.mlService.getModelPerformances(auth?.tenantId ?? '', shopId);
    return { data: performances };
  }
}
