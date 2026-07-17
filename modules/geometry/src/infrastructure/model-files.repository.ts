import type { Pool, PoolClient } from 'pg';

import { withTenantSession } from '@3d-print-os/persistence';

import type { ModelFile, ModelFileStatus } from '../domain/types';

function mapRow(row: {
  id: string;
  tenant_id: string;
  uploaded_by_user_id: string;
  shop_id: string | null;
  original_filename: string;
  byte_size: string | number;
  content_type: string;
  storage_bucket: string;
  storage_key: string;
  checksum_sha256: string | null;
  status: ModelFileStatus;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}): ModelFile {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    uploadedByUserId: row.uploaded_by_user_id,
    shopId: row.shop_id,
    originalFilename: row.original_filename,
    byteSize: Number(row.byte_size),
    contentType: row.content_type,
    storageBucket: row.storage_bucket,
    storageKey: row.storage_key,
    checksumSha256: row.checksum_sha256,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export class ModelFilesRepository {
  constructor(private readonly pool: Pool) {}

  withTenant<T>(tenantId: string, work: (client: PoolClient) => Promise<T>): Promise<T> {
    return withTenantSession(this.pool, { tenantId }, work);
  }

  async create(
    client: PoolClient,
    input: {
      id: string;
      tenantId: string;
      userId: string;
      shopId: string | null;
      originalFilename: string;
      byteSize: number;
      contentType: string;
      storageBucket: string;
      storageKey: string;
    },
  ): Promise<ModelFile> {
    const result = await client.query({
      text: `INSERT INTO model_files (
              id, tenant_id, uploaded_by_user_id, shop_id, original_filename, byte_size,
              content_type, storage_bucket, storage_key, status
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending_upload')
            RETURNING *`,
      values: [
        input.id,
        input.tenantId,
        input.userId,
        input.shopId,
        input.originalFilename,
        input.byteSize,
        input.contentType,
        input.storageBucket,
        input.storageKey,
      ],
    });
    return mapRow(result.rows[0]);
  }

  async findById(client: PoolClient, tenantId: string, id: string): Promise<ModelFile | null> {
    const result = await client.query(
      `SELECT * FROM model_files WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    const row = result.rows[0];
    return row ? mapRow(row) : null;
  }

  async markUploaded(
    client: PoolClient,
    tenantId: string,
    id: string,
    checksumSha256?: string,
  ): Promise<ModelFile | null> {
    const result = await client.query(
      `UPDATE model_files
       SET status = 'uploaded',
           checksum_sha256 = COALESCE($3, checksum_sha256),
           updated_at = now()
       WHERE id = $1 AND tenant_id = $2 AND status = 'pending_upload' AND deleted_at IS NULL
       RETURNING *`,
      [id, tenantId, checksumSha256 ?? null],
    );
    const row = result.rows[0];
    return row ? mapRow(row) : null;
  }

  async markFailed(client: PoolClient, tenantId: string, id: string): Promise<void> {
    await client.query(
      `UPDATE model_files
       SET status = 'failed', updated_at = now()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId],
    );
  }

  async softDelete(client: PoolClient, tenantId: string, id: string): Promise<ModelFile | null> {
    const result = await client.query(
      `UPDATE model_files
       SET status = 'deleted', deleted_at = now(), updated_at = now()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [id, tenantId],
    );
    const row = result.rows[0];
    return row ? mapRow(row) : null;
  }

  async shopExists(client: PoolClient, tenantId: string, shopId: string): Promise<boolean> {
    const result = await client.query(
      `SELECT 1 FROM shops WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1`,
      [shopId, tenantId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
