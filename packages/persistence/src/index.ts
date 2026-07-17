import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

export const PERSISTENCE_PACKAGE = '@3d-print-os/persistence' as const;

export type CreateDatabasePoolOptions = {
  connectionString: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
};

/**
 * Creates a Postgres connection pool.
 * Does not verify connectivity — call `checkDatabaseConnectivity` when needed.
 */
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

export type { Pool, PoolClient, QueryResult };
