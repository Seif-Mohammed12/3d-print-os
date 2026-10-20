import type { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { CustomerRepository } from '../customers/repositories/customer.repository';
import { MLRepository } from '../ml/repositories/ml.repository';
import { OrderRepository } from '../orders/repositories/order.repository';
import { PortalService } from '../portal/portal.service';
import { PricingRepository } from '../pricing/repositories/pricing.repository';
import { PrinterRepository } from '../printers/repositories/printer.repository';
import { QuoteRepository } from '../quotes/repositories/quote.repository';
import { NotFoundAppError } from './errors/app.error';
import { assertTenantReferences, type TenantReferenceTable } from './tenant-references';

const TENANT = '11111111-1111-4111-8111-111111111111';
const ID = '22222222-2222-4222-8222-222222222222';
const FOREIGN_ID = '33333333-3333-4333-8333-333333333333';

type RecordedQuery = { text: string; params: unknown[] };

/**
 * Every `SELECT 1 FROM <table>` existence check finds a row unless it asks for FOREIGN_ID,
 * which stands for a row owned by another tenant. Other SELECTs return one row so that
 * lookups like the portal's customer record succeed.
 */
function fakePool(): { pool: Pool; queries: RecordedQuery[] } {
  const queries: RecordedQuery[] = [];
  const run = async (text: string, params: unknown[] = []) => {
    queries.push({ text, params });
    if (/^\s*SELECT 1 FROM/i.test(text)) {
      const found = params[0] !== FOREIGN_ID;
      return { rows: found ? [{}] : [], rowCount: found ? 1 : 0 };
    }
    if (/^\s*SELECT id FROM portal_customers/i.test(text)) {
      return { rows: [{ id: ID }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  };
  const pool = {
    query: run,
    connect: async () => ({ query: run, release: () => undefined }),
  } as unknown as Pool;
  return { pool, queries };
}

const isWrite = (text: string) => /^\s*(INSERT INTO|UPDATE)\s/i.test(text);

describe('assertTenantReferences', () => {
  it('checks each provided id against its table and the tenant', async () => {
    const { pool, queries } = fakePool();
    await assertTenantReferences(pool, TENANT, [
      { table: 'printers', id: ID, field: 'printerId' },
      { table: 'materials', id: null, field: 'materialId' },
      { table: 'shops', id: undefined, field: 'shopId' },
    ]);
    expect(queries).toEqual([
      { text: 'SELECT 1 FROM printers WHERE id = $1 AND tenant_id = $2', params: [ID, TENANT] },
    ]);
  });

  it('throws a 404 naming the field when the row is not in the tenant', async () => {
    const { pool } = fakePool();
    const error = await assertTenantReferences(pool, TENANT, [
      { table: 'printers', id: FOREIGN_ID, field: 'printerId' },
    ]).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NotFoundAppError);
    expect(error).toMatchObject({ statusCode: 404, message: 'printerId not found' });
  });
});

/** [name, table whose id is replaced with another tenant's, write using that id] */
type ReferenceCase = [
  name: string,
  table: TenantReferenceTable,
  call: (pool: Pool, ids: (table: TenantReferenceTable) => string) => Promise<unknown>,
];

const cases: ReferenceCase[] = [
  ...(['shops', 'customers', 'model_files', 'materials', 'printers'] as const).map(
    (table): ReferenceCase => [
      `quotes.create rejects a foreign ${table} id`,
      table,
      (p, ids) =>
        new QuoteRepository(p).create({
          tenantId: TENANT,
          shop_id: ids('shops'),
          customer_id: ids('customers'),
          model_id: ids('model_files'),
          material_id: ids('materials'),
          printer_id: ids('printers'),
        }),
    ],
  ),
  ...(['materials', 'printers'] as const).map((table): ReferenceCase => [
    `quotes.update rejects a foreign ${table} id`,
    table,
    (p, ids) =>
      new QuoteRepository(p).update(
        ID,
        { material_id: ids('materials'), printer_id: ids('printers') },
        TENANT,
      ),
  ]),
  ...(['shops', 'customers', 'quotes', 'printers'] as const).map((table): ReferenceCase => [
    `orders.createFromQuote rejects a foreign ${table} id`,
    table,
    (p, ids) =>
      new OrderRepository(p).createFromQuote({
        tenantId: TENANT,
        shop_id: ids('shops'),
        customer_id: ids('customers'),
        quote_id: ids('quotes'),
        printer_id: ids('printers'),
        subtotal_cents: 100,
        tax_cents: 0,
        total_cents: 100,
      } as never),
  ]),
  [
    'orders.update rejects a foreign printer id',
    'printers',
    (p, ids) => new OrderRepository(p).update(ID, { printer_id: ids('printers') }, TENANT),
  ],
  [
    'orders.createItem rejects a foreign printer id',
    'printers',
    (p, ids) =>
      new OrderRepository(p).createItem(
        ID,
        {
          item_name: 'x',
          quantity: 1,
          unit_price_cents: 100,
          printer_id: ids('printers'),
        } as never,
        TENANT,
      ),
  ],
  [
    'orders.updateItem rejects a foreign printer id',
    'printers',
    (p, ids) => new OrderRepository(p).updateItem(ID, { printer_id: ids('printers') }, TENANT),
  ],
  ...(['shops', 'materials', 'printers'] as const).map((table): ReferenceCase => [
    `pricing.create rejects a foreign ${table} id`,
    table,
    (p, ids) =>
      new PricingRepository(p).create({
        tenantId: TENANT,
        shop_id: ids('shops'),
        material_id: ids('materials'),
        printer_id: ids('printers'),
      }),
  ]),
  ...(['shops', 'materials', 'printers'] as const).map((table): ReferenceCase => [
    `pricing.update rejects a foreign ${table} id`,
    table,
    (p, ids) =>
      new PricingRepository(p).update(
        ID,
        {
          shop_id: ids('shops'),
          material_id: ids('materials'),
          printer_id: ids('printers'),
        },
        TENANT,
      ),
  ]),
  [
    'customers.create rejects a foreign shop id',
    'shops',
    (p, ids) =>
      new CustomerRepository(p).create({ tenantId: TENANT, shop_id: ids('shops'), name: 'x' }),
  ],
  [
    'printers.create rejects a foreign shop id',
    'shops',
    (p, ids) =>
      new PrinterRepository(p).create({
        tenantId: TENANT,
        shop_id: ids('shops'),
        name: 'x',
        technology: 'FDM',
      } as never),
  ],
  ...(['shops', 'quotes', 'orders', 'model_files'] as const).map((table): ReferenceCase => [
    `ml.createTrainingSample rejects a foreign ${table} id`,
    table,
    (p, ids) =>
      new MLRepository(p).createTrainingSample({
        tenant_id: TENANT,
        shop_id: ids('shops'),
        quote_id: ids('quotes'),
        order_id: ids('orders'),
        model_file_id: ids('model_files'),
      } as never),
  ]),
  [
    'ml.createDatasetExport rejects a foreign shop id',
    'shops',
    (p, ids) =>
      new MLRepository(p).createDatasetExport({
        tenant_id: TENANT,
        shop_id: ids('shops'),
        export_type: 'price_prediction',
      } as never),
  ],
  [
    'portal.createQuoteRequest rejects a foreign model file id',
    'model_files',
    (p, ids) =>
      new PortalService(p).createQuoteRequest(ID, TENANT, { modelFileId: ids('model_files') }),
  ],
];

describe('writes validate referenced ids against the tenant', () => {
  it.each(cases)('%s', async (_name, foreignTable, call) => {
    const { pool, queries } = fakePool();
    const ids = (table: TenantReferenceTable) => (table === foreignTable ? FOREIGN_ID : ID);
    const error = await call(pool, ids).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NotFoundAppError);
    expect(queries.some((q) => isWrite(q.text))).toBe(false);
  });

  it.each(cases)('%s — but writes when every id is in the tenant', async (_name, _t, call) => {
    const { pool, queries } = fakePool();
    await call(pool, () => ID).catch(() => undefined);
    expect(queries.some((q) => isWrite(q.text))).toBe(true);
  });
});
