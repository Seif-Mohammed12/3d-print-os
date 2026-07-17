import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

export const PERSISTENCE_PACKAGE = '@3d-print-os/persistence' as const;

export type CreateDatabasePoolOptions = {
  connectionString: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
};

export function createDatabasePool(options: CreateDatabasePoolOptions): Pool {
  return new Pool({
    connectionString: options.connectionString,
    max: options.max ?? 10,
    idleTimeoutMillis: options.idleTimeoutMillis ?? 30_000,
    connectionTimeoutMillis: options.connectionTimeoutMillis ?? 5_000,
  });
}

export async function checkDatabaseConnectivity(pool: Pool): Promise<boolean> {
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    client?.release();
  }
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  pool: Pool,
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export type TenantSessionOptions = {
  tenantId?: string;
  bypassRls?: boolean;
};

/**
 * Runs work on a dedicated client with optional RLS session variables.
 */
export async function withTenantSession<T>(
  pool: Pool,
  options: TenantSessionOptions,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (options.bypassRls) {
      await client.query(`SELECT set_config('app.bypass_rls', 'on', true)`);
    }
    if (options.tenantId) {
      await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [options.tenantId]);
    }
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export type { Pool, PoolClient, QueryResult };
