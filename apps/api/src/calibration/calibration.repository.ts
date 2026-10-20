import type { Pool } from 'pg';

import { withTenantSession } from '@3d-print-os/persistence';

import type { CalibrationSample } from '../quotes/domain/calibration';

/** Upper bound on rows read per printer; the domain function windows these further. */
const MAX_SAMPLES_PER_PRINTER = 200;

export type PrintOutcome = {
  id: string;
  tenant_id: string;
  shop_id: string;
  order_id: string;
  quote_id: string;
  printer_id: string;
  material_id: string;
  printed_on_printer_id: string | null;
  slicer_version: string | null;
  estimated_print_time_s: string;
  estimated_filament_g: string;
  actual_print_minutes: string | null;
  actual_filament_g: string | null;
  notes: string | null;
  recorded_by: string | null;
  recorded_at: Date;
  created_at: Date;
  updated_at: Date;
};

export type OrderOutcomeContext = {
  order_id: string;
  shop_id: string;
  quote_id: string;
  status: string;
  production_status: string;
  order_printer_id: string | null;
  quote_printer_id: string | null;
  material_id: string | null;
  estimate_source: string | null;
  slice_result: {
    slicer?: { version?: string };
    estimate?: { print_time_s?: number; filament_g?: number };
  } | null;
};

export type RecordOutcomeData = {
  tenantId: string;
  shopId: string;
  orderId: string;
  quoteId: string;
  printerId: string;
  materialId: string;
  printedOnPrinterId: string | null;
  slicerVersion: string | null;
  estimatedPrintTimeSeconds: number;
  estimatedFilamentGrams: number;
  actualPrintMinutes: number | null;
  actualFilamentGrams: number | null;
  notes: string | null;
  recordedBy: string | null;
};

type SampleRow = {
  printer_id: string;
  material_id: string;
  estimated_print_time_s: string;
  estimated_filament_g: string;
  actual_print_minutes: string | null;
  actual_filament_g: string | null;
  recorded_at: Date;
};

function toNumber(value: string | null): number | null {
  return value === null ? null : Number(value);
}

export class CalibrationRepository {
  constructor(private pool: Pool) {}

  async getOrderContext(orderId: string, tenantId: string): Promise<OrderOutcomeContext | null> {
    return withTenantSession(this.pool, { tenantId }, async (client) => {
      const result = await client.query<OrderOutcomeContext>(
        `SELECT o.id AS order_id, o.shop_id, o.quote_id, o.status, o.production_status,
                o.printer_id AS order_printer_id, q.printer_id AS quote_printer_id,
                q.material_id, q.estimate_source, q.slice_result
         FROM orders o
         JOIN quotes q ON q.id = o.quote_id AND q.tenant_id = o.tenant_id
         WHERE o.id = $1 AND o.tenant_id = $2`,
        [orderId, tenantId],
      );
      return result.rows[0] ?? null;
    });
  }

  /** One outcome per order: re-recording corrects the earlier entry. */
  async upsertOutcome(data: RecordOutcomeData): Promise<PrintOutcome> {
    return withTenantSession(this.pool, { tenantId: data.tenantId }, async (client) => {
      const result = await client.query<PrintOutcome>(
        `INSERT INTO print_outcomes (
           tenant_id, shop_id, order_id, quote_id, printer_id, material_id,
           printed_on_printer_id, slicer_version, estimated_print_time_s, estimated_filament_g,
           actual_print_minutes, actual_filament_g, notes, recorded_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (order_id) DO UPDATE SET
           printed_on_printer_id = EXCLUDED.printed_on_printer_id,
           actual_print_minutes = EXCLUDED.actual_print_minutes,
           actual_filament_g = EXCLUDED.actual_filament_g,
           notes = EXCLUDED.notes,
           recorded_by = EXCLUDED.recorded_by,
           recorded_at = now(),
           updated_at = now()
         WHERE print_outcomes.tenant_id = EXCLUDED.tenant_id
         RETURNING *`,
        [
          data.tenantId,
          data.shopId,
          data.orderId,
          data.quoteId,
          data.printerId,
          data.materialId,
          data.printedOnPrinterId,
          data.slicerVersion,
          data.estimatedPrintTimeSeconds,
          data.estimatedFilamentGrams,
          data.actualPrintMinutes,
          data.actualFilamentGrams,
          data.notes,
          data.recordedBy,
        ],
      );
      const outcome = result.rows[0];
      if (!outcome) {
        throw new Error('Failed to record print outcome');
      }

      // Keep the ML training set's labels in step when a sample exists for this quote.
      if (data.actualPrintMinutes !== null) {
        await client.query(
          `UPDATE training_samples
           SET actual_print_time_minutes = $1, order_id = COALESCE(order_id, $2)
           WHERE quote_id = $3 AND tenant_id = $4`,
          [Math.round(data.actualPrintMinutes), data.orderId, data.quoteId, data.tenantId],
        );
      }
      return outcome;
    });
  }

  async findByOrder(orderId: string, tenantId: string): Promise<PrintOutcome | null> {
    return withTenantSession(this.pool, { tenantId }, async (client) => {
      const result = await client.query<PrintOutcome>(
        'SELECT * FROM print_outcomes WHERE order_id = $1 AND tenant_id = $2',
        [orderId, tenantId],
      );
      return result.rows[0] ?? null;
    });
  }

  /**
   * Recent outcomes per printer. Jobs staff moved to a different printer are left out:
   * their estimate was sliced for another machine.
   */
  async listSamples(tenantId: string, printerId?: string): Promise<CalibrationSample[]> {
    const rows = await withTenantSession(this.pool, { tenantId }, async (client) => {
      const result = await client.query<SampleRow>(
        `SELECT printer_id, material_id, estimated_print_time_s, estimated_filament_g,
                actual_print_minutes, actual_filament_g, recorded_at
         FROM (
           SELECT *, row_number() OVER (PARTITION BY printer_id ORDER BY recorded_at DESC) AS rn
           FROM print_outcomes
           WHERE tenant_id = $1
             AND ($2::uuid IS NULL OR printer_id = $2::uuid)
             AND (printed_on_printer_id IS NULL OR printed_on_printer_id = printer_id)
         ) recent
         WHERE rn <= $3`,
        [tenantId, printerId ?? null, MAX_SAMPLES_PER_PRINTER],
      );
      return result.rows;
    });
    return rows.map((row) => ({
      printerId: row.printer_id,
      materialId: row.material_id,
      estimatedPrintTimeSeconds: toNumber(row.estimated_print_time_s),
      estimatedFilamentGrams: toNumber(row.estimated_filament_g),
      actualPrintMinutes: toNumber(row.actual_print_minutes),
      actualFilamentGrams: toNumber(row.actual_filament_g),
      recordedAt: row.recorded_at,
    }));
  }

  async listPrinters(
    tenantId: string,
  ): Promise<Array<{ id: string; name: string; status: string }>> {
    return withTenantSession(this.pool, { tenantId }, async (client) => {
      const result = await client.query<{ id: string; name: string; status: string }>(
        `SELECT id, name, status FROM printers
         WHERE tenant_id = $1 AND technology = 'FDM'
         ORDER BY name`,
        [tenantId],
      );
      return result.rows;
    });
  }

  async listMaterialNames(tenantId: string): Promise<Map<string, string>> {
    return withTenantSession(this.pool, { tenantId }, async (client) => {
      const result = await client.query<{ id: string; name: string }>(
        'SELECT id, name FROM materials WHERE tenant_id = $1',
        [tenantId],
      );
      return new Map(result.rows.map((row) => [row.id, row.name]));
    });
  }
}
