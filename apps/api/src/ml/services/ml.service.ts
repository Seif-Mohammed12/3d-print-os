import { Injectable } from '@nestjs/common';

import type { TrainingSample, FeatureVector, DatasetExport } from '../repositories/ml.repository';
import { MLRepository } from '../repositories/ml.repository';

@Injectable()
export class MLService {
  constructor(private repo: MLRepository) {}

  async createTrainingSample(
    data: Omit<TrainingSample, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<TrainingSample> {
    return this.repo.createTrainingSample(data);
  }

  async createFeatureVector(
    data: Omit<FeatureVector, 'id' | 'created_at'>,
    tenantId: string,
  ): Promise<FeatureVector> {
    return this.repo.createFeatureVector(data, tenantId);
  }

  async createDatasetExport(
    data: Omit<DatasetExport, 'id' | 'created_at' | 'completed_at'>,
  ): Promise<DatasetExport> {
    return this.repo.createDatasetExport(data);
  }

  async updateDatasetExport(
    id: string,
    data: Partial<Omit<DatasetExport, 'id' | 'tenant_id' | 'created_at'>>,
    tenantId: string,
  ): Promise<DatasetExport | null> {
    return this.repo.updateDatasetExport(id, data, tenantId);
  }

  async getTrainingSamples(
    tenantId: string,
    shopId?: string,
    startDate?: Date,
    endDate?: Date,
    exportType?: string,
  ): Promise<TrainingSample[]> {
    return this.repo.getTrainingSamples(tenantId, shopId, startDate, endDate, exportType);
  }

  async getDatasetExports(tenantId: string, shopId?: string): Promise<DatasetExport[]> {
    return this.repo.getDatasetExports(tenantId, shopId);
  }

  async getModelPerformances(tenantId: string, shopId?: string) {
    return this.repo.getModelPerformances(tenantId, shopId);
  }

  // Feature collection from quote
  async collectFeaturesFromQuote(
    _quoteId: string,
    _tenantId: string,
  ): Promise<FeatureVector | null> {
    // This would collect features from a quote and create a feature vector
    // For now, this is a placeholder for future implementation
    return null;
  }

  // Export dataset to CSV
  async exportDatasetToCSV(
    tenantId: string,
    shopId: string | undefined,
    exportType: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<DatasetExport> {
    const samples = await this.getTrainingSamples(tenantId, shopId, startDate, endDate, exportType);

    const datasetExport = await this.createDatasetExport({
      tenant_id: tenantId,
      shop_id: shopId ?? null,
      export_type: exportType,
      feature_version: '1.0',
      date_range_start: startDate ?? null,
      date_range_end: endDate ?? null,
      sample_count: samples.length,
      feature_count: 0, // Will be calculated based on export type
      file_path: null,
      file_format: 'csv',
      file_size_bytes: null,
      status: 'processing',
      error_message: null,
      created_by: null,
    });

    // TODO: Generate CSV file and update export with file path and size
    // For now, mark as completed
    await this.updateDatasetExport(
      datasetExport.id,
      {
        status: 'completed',
        completed_at: new Date(),
      },
      tenantId,
    );

    return datasetExport;
  }
}
