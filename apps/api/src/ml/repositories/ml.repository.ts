import type { Pool } from 'pg';
import { withTenantSession } from '@3d-print-os/persistence';

import { assertTenantReferences } from '../../shared/tenant-references';

export interface TrainingSample {
  id: string;
  tenant_id: string;
  shop_id: string;
  quote_id: string;
  order_id: string | null;
  model_file_id: string;
  volume_mm3: number | null;
  surface_area_mm2: number | null;
  bounding_box_x_mm: number | null;
  bounding_box_y_mm: number | null;
  bounding_box_z_mm: number | null;
  aspect_ratio_x: number | null;
  aspect_ratio_y: number | null;
  aspect_ratio_z: number | null;
  complexity_score: number | null;
  overhang_percentage: number | null;
  support_volume_mm3: number | null;
  hollow_volume_mm3: number | null;
  wall_thickness_mm: number | null;
  layer_height_mm: number | null;
  infill_percentage: number | null;
  print_speed_mm_per_s: number | null;
  nozzle_diameter_mm: number | null;
  material_type: string | null;
  material_brand: string | null;
  material_density_g_per_cm3: number | null;
  material_color: string | null;
  printer_technology: string | null;
  printer_build_volume_x_mm: number | null;
  printer_build_volume_y_mm: number | null;
  printer_build_volume_z_mm: number | null;
  printer_nozzle_diameter_mm: number | null;
  quoted_price_cents: number | null;
  quoted_time_minutes: number | null;
  quoted_material_cost_cents: number | null;
  quoted_machine_cost_cents: number | null;
  actual_price_cents: number | null;
  actual_print_time_minutes: number | null;
  actual_material_cost_cents: number | null;
  actual_machine_cost_cents: number | null;
  actual_electricity_cost_cents: number | null;
  did_fail: boolean;
  failure_type: string | null;
  failure_reason: string | null;
  failure_stage: string | null;
  customer_accepted: boolean | null;
  customer_rating: number | null;
  customer_feedback: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface FeatureVector {
  id: string;
  training_sample_id: string;
  geometry_features: unknown;
  print_settings_features: unknown;
  material_features: unknown;
  printer_features: unknown;
  combined_features: unknown;
  feature_version: string;
  created_at: Date;
}

export interface DatasetExport {
  id: string;
  tenant_id: string;
  shop_id: string | null;
  export_type: string;
  feature_version: string;
  date_range_start: Date | null;
  date_range_end: Date | null;
  sample_count: number | null;
  feature_count: number | null;
  file_path: string | null;
  file_format: string | null;
  file_size_bytes: number | null;
  status: string;
  error_message: string | null;
  created_by: string | null;
  created_at: Date;
  completed_at: Date | null;
}

export interface ModelPerformance {
  id: string;
  tenant_id: string;
  shop_id: string | null;
  model_type: string;
  model_version: string;
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1_score: number | null;
  mae: number | null;
  rmse: number | null;
  r2_score: number | null;
  training_samples: number | null;
  validation_samples: number | null;
  training_duration_seconds: number | null;
  trained_at: Date;
  created_by: string | null;
}

export class MLRepository {
  constructor(private pool: Pool) {}

  async createTrainingSample(
    data: Omit<TrainingSample, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<TrainingSample> {
    const result = await withTenantSession(this.pool, { tenantId: data.tenant_id }, async (client) => {
      await assertTenantReferences(client, data.tenant_id, [
        { table: 'shops', id: data.shop_id, field: 'shop_id' },
        { table: 'quotes', id: data.quote_id, field: 'quote_id' },
        { table: 'orders', id: data.order_id, field: 'order_id' },
        { table: 'model_files', id: data.model_file_id, field: 'model_file_id' },
      ]);
      const insertResult = await client.query<TrainingSample>(
        `INSERT INTO training_samples (
          tenant_id, shop_id, quote_id, order_id, model_file_id,
          volume_mm3, surface_area_mm2, bounding_box_x_mm, bounding_box_y_mm, bounding_box_z_mm,
          aspect_ratio_x, aspect_ratio_y, aspect_ratio_z, complexity_score, overhang_percentage,
          support_volume_mm3, hollow_volume_mm3, wall_thickness_mm,
          layer_height_mm, infill_percentage, print_speed_mm_per_s, nozzle_diameter_mm,
          material_type, material_brand, material_density_g_per_cm3, material_color,
          printer_technology, printer_build_volume_x_mm, printer_build_volume_y_mm, printer_build_volume_z_mm, printer_nozzle_diameter_mm,
          quoted_price_cents, quoted_time_minutes, quoted_material_cost_cents, quoted_machine_cost_cents,
          actual_price_cents, actual_print_time_minutes, actual_material_cost_cents, actual_machine_cost_cents, actual_electricity_cost_cents,
          did_fail, failure_type, failure_reason, failure_stage,
          customer_accepted, customer_rating, customer_feedback
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46)
        RETURNING *`,
        [
          data.tenant_id,
          data.shop_id,
          data.quote_id,
          data.order_id,
          data.model_file_id,
          data.volume_mm3,
          data.surface_area_mm2,
          data.bounding_box_x_mm,
          data.bounding_box_y_mm,
          data.bounding_box_z_mm,
          data.aspect_ratio_x,
          data.aspect_ratio_y,
          data.aspect_ratio_z,
          data.complexity_score,
          data.overhang_percentage,
          data.support_volume_mm3,
          data.hollow_volume_mm3,
          data.wall_thickness_mm,
          data.layer_height_mm,
          data.infill_percentage,
          data.print_speed_mm_per_s,
          data.nozzle_diameter_mm,
          data.material_type,
          data.material_brand,
          data.material_density_g_per_cm3,
          data.material_color,
          data.printer_technology,
          data.printer_build_volume_x_mm,
          data.printer_build_volume_y_mm,
          data.printer_build_volume_z_mm,
          data.printer_nozzle_diameter_mm,
          data.quoted_price_cents,
          data.quoted_time_minutes,
          data.quoted_material_cost_cents,
          data.quoted_machine_cost_cents,
          data.actual_price_cents,
          data.actual_print_time_minutes,
          data.actual_material_cost_cents,
          data.actual_machine_cost_cents,
          data.actual_electricity_cost_cents,
          data.did_fail,
          data.failure_type,
          data.failure_reason,
          data.failure_stage,
          data.customer_accepted,
          data.customer_rating,
          data.customer_feedback,
        ],
      );

      return insertResult.rows[0];
    });

    if (!result) {
      throw new Error('Failed to create training sample');
    }

    return result;
  }

  async createFeatureVector(
    data: Omit<FeatureVector, 'id' | 'created_at'>,
    tenantId: string,
  ): Promise<FeatureVector> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      // feature_vectors has no tenant_id; it is scoped through its training sample.
      const owned = await client.query(
        'SELECT 1 FROM training_samples WHERE id = $1 AND tenant_id = $2',
        [data.training_sample_id, tenantId],
      );
      if ((owned.rowCount ?? 0) === 0) {
        return undefined;
      }
      const insertResult = await client.query<FeatureVector>(
        `INSERT INTO feature_vectors (training_sample_id, geometry_features, print_settings_features, material_features, printer_features, combined_features, feature_version)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          data.training_sample_id,
          JSON.stringify(data.geometry_features),
          JSON.stringify(data.print_settings_features),
          JSON.stringify(data.material_features),
          JSON.stringify(data.printer_features),
          JSON.stringify(data.combined_features),
          data.feature_version,
        ],
      );

      return insertResult.rows[0];
    });

    if (!result) {
      throw new Error('Failed to create feature vector');
    }

    return result;
  }

  async createDatasetExport(
    data: Omit<DatasetExport, 'id' | 'created_at' | 'completed_at'>,
  ): Promise<DatasetExport> {
    const result = await withTenantSession(this.pool, { tenantId: data.tenant_id }, async (client) => {
      await assertTenantReferences(client, data.tenant_id, [
        { table: 'shops', id: data.shop_id, field: 'shop_id' },
      ]);
      const insertResult = await client.query<DatasetExport>(
        `INSERT INTO dataset_exports (tenant_id, shop_id, export_type, feature_version, date_range_start, date_range_end, sample_count, feature_count, file_path, file_format, file_size_bytes, status, error_message, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
        [
          data.tenant_id,
          data.shop_id,
          data.export_type,
          data.feature_version,
          data.date_range_start,
          data.date_range_end,
          data.sample_count,
          data.feature_count,
          data.file_path,
          data.file_format,
          data.file_size_bytes,
          data.status,
          data.error_message,
          data.created_by,
        ],
      );

      return insertResult.rows[0];
    });

    if (!result) {
      throw new Error('Failed to create dataset export');
    }

    return result;
  }

  async updateDatasetExport(
    id: string,
    data: Partial<Omit<DatasetExport, 'id' | 'tenant_id' | 'created_at'>>,
    tenantId: string,
  ): Promise<DatasetExport | null> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.sample_count !== undefined) {
        updates.push(`sample_count = $${paramIndex}`);
        values.push(data.sample_count);
        paramIndex++;
      }
      if (data.feature_count !== undefined) {
        updates.push(`feature_count = $${paramIndex}`);
        values.push(data.feature_count);
        paramIndex++;
      }
      if (data.file_path !== undefined) {
        updates.push(`file_path = $${paramIndex}`);
        values.push(data.file_path);
        paramIndex++;
      }
      if (data.file_format !== undefined) {
        updates.push(`file_format = $${paramIndex}`);
        values.push(data.file_format);
        paramIndex++;
      }
      if (data.file_size_bytes !== undefined) {
        updates.push(`file_size_bytes = $${paramIndex}`);
        values.push(data.file_size_bytes);
        paramIndex++;
      }
      if (data.status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        values.push(data.status);
        paramIndex++;
      }
      if (data.error_message !== undefined) {
        updates.push(`error_message = $${paramIndex}`);
        values.push(data.error_message);
        paramIndex++;
      }
      if (data.completed_at !== undefined) {
        updates.push(`completed_at = $${paramIndex}`);
        values.push(data.completed_at);
        paramIndex++;
      }

      if (updates.length === 0) {
        return null;
      }

      const updateResult = await client.query<DatasetExport>(
        `UPDATE dataset_exports SET ${updates.join(', ')}
         WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
         RETURNING *`,
        [...values, id, tenantId],
      );

      return updateResult.rows[0] ?? null;
    });

    return result;
  }

  async getTrainingSamples(
    tenantId: string,
    shopId?: string,
    startDate?: Date,
    endDate?: Date,
    exportType?: string,
  ): Promise<TrainingSample[]> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const conditions: string[] = ['tenant_id = $1'];
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      if (shopId) {
        conditions.push(`shop_id = $${paramIndex}`);
        values.push(shopId);
        paramIndex++;
      }

      if (startDate) {
        conditions.push(`created_at >= $${paramIndex}`);
        values.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        conditions.push(`created_at <= $${paramIndex}`);
        values.push(endDate);
        paramIndex++;
      }

      // Filter based on export type
      if (exportType === 'price_prediction') {
        // Need actual price for price prediction
        conditions.push(`actual_price_cents IS NOT NULL`);
      } else if (exportType === 'failure_prediction') {
        // Need failure information
        conditions.push(`did_fail = true`);
      } else if (exportType === 'material_recommendation') {
        // Need material information and actual outcomes
        conditions.push(`material_type IS NOT NULL AND actual_price_cents IS NOT NULL`);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const queryResult = await client.query<TrainingSample>(
        `SELECT * FROM training_samples ${whereClause} ORDER BY created_at DESC`,
        values,
      );

      return queryResult.rows;
    });

    return result;
  }

  async getDatasetExports(tenantId: string, shopId?: string): Promise<DatasetExport[]> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const conditions: string[] = ['tenant_id = $1'];
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      if (shopId) {
        conditions.push(`shop_id = $${paramIndex}`);
        values.push(shopId);
        paramIndex++;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const queryResult = await client.query<DatasetExport>(
        `SELECT * FROM dataset_exports ${whereClause} ORDER BY created_at DESC`,
        values,
      );

      return queryResult.rows;
    });

    return result;
  }

  async getModelPerformances(tenantId: string, shopId?: string): Promise<ModelPerformance[]> {
    const result = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const conditions: string[] = ['tenant_id = $1'];
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      if (shopId) {
        conditions.push(`shop_id = $${paramIndex}`);
        values.push(shopId);
        paramIndex++;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const queryResult = await client.query<ModelPerformance>(
        `SELECT * FROM model_performance ${whereClause} ORDER BY trained_at DESC`,
        values,
      );

      return queryResult.rows;
    });

    return result;
  }
}
