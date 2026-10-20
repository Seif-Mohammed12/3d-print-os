import { NotFoundAppError } from './errors/app.error';

/** Tables that carry tenant_id and are referenced by id from other tenant rows. */
export type TenantReferenceTable =
  'shops' | 'customers' | 'model_files' | 'printers' | 'materials' | 'quotes' | 'orders';

export type TenantReference = {
  table: TenantReferenceTable;
  /** Skipped when null or undefined (optional reference not being set). */
  id: string | null | undefined;
  /** Request field name, used in the error. */
  field: string;
};

type Queryable = {
  query(text: string, values?: unknown[]): Promise<{ rowCount: number | null }>;
};

/**
 * Foreign keys (and RLS, which FK checks bypass) don't stop a row from pointing at another
 * tenant's row. Call this before writing ids taken from a request. A reference to another
 * tenant's row is reported exactly like a missing one: 404.
 */
export async function assertTenantReferences(
  db: Queryable,
  tenantId: string,
  references: TenantReference[],
): Promise<void> {
  for (const ref of references) {
    if (ref.id === null || ref.id === undefined) {
      continue;
    }
    const result = await db.query(`SELECT 1 FROM ${ref.table} WHERE id = $1 AND tenant_id = $2`, [
      ref.id,
      tenantId,
    ]);
    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundAppError(`${ref.field} not found`, 'reference.not_found');
    }
  }
}
