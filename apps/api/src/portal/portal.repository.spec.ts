import type { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { PortalRepository } from './portal.repository';

const TENANT = '11111111-1111-4111-8111-111111111111';
const CRM = '33333333-3333-4333-8333-333333333333';
const USER = '44444444-4444-4444-8444-444444444444';
const ID = '22222222-2222-4222-8222-222222222222';

type Recorded = { text: string; params: unknown[] };

function fakePool(
  respond: (text: string) => { rows: unknown[]; rowCount?: number } = () => ({
    rows: [],
  }),
): { pool: Pool; queries: Recorded[] } {
  const queries: Recorded[] = [];
  const run = async (text: string, params: unknown[] = []) => {
    queries.push({ text, params });
    const result = respond(text);
    return { rowCount: result.rows.length, ...result };
  };
  const pool = {
    query: run,
    connect: async () => ({ query: run, release: () => undefined }),
  } as unknown as Pool;
  return { pool, queries };
}

const dataStatements = (queries: Recorded[]) =>
  queries.filter(
    (q) =>
      !/^(BEGIN|COMMIT|ROLLBACK)$/.test(q.text.trim()) &&
      !q.text.includes('set_config') &&
      !q.text.includes('SAVEPOINT'),
  );

/** Cost and audit columns that must never be selected for the portal. */
const INTERNAL_COLUMNS =
  /_cost_cents|subtotal_cents|tax_cents|pricing_breakdown|slice_result|internal_notes|risk_|difficulty_score|q\.\*/;

describe('PortalRepository customer scoping', () => {
  it.each([
    ['listQuotes', (r: PortalRepository) => r.listQuotes(TENANT, CRM)],
    ['findQuote', (r: PortalRepository) => r.findQuote(TENANT, CRM, ID)],
  ])(
    '%s filters on tenant, CRM customer and portal source, and selects no costs',
    async (_, call) => {
      const { pool, queries } = fakePool();
      await call(new PortalRepository(pool));
      const [statement] = dataStatements(queries);
      expect(statement!.text).toMatch(
        /q\.tenant_id = \$1 AND q\.customer_id = \$2 AND q\.source = 'portal'/,
      );
      expect(statement!.params.slice(0, 2)).toEqual([TENANT, CRM]);
      expect(statement!.text).not.toMatch(INTERNAL_COLUMNS);
    },
  );

  it('listOrders filters on tenant and CRM customer and selects no internal notes', async () => {
    const { pool, queries } = fakePool();
    await new PortalRepository(pool).listOrders(TENANT, CRM);
    const [statement] = dataStatements(queries);
    expect(statement!.text).toMatch(/o\.tenant_id = \$1 AND o\.customer_id = \$2/);
    expect(statement!.params).toEqual([TENANT, CRM]);
    expect(statement!.text).not.toMatch(/internal_notes|o\.\*/);
  });

  it('findOwnModel only matches models the caller uploaded', async () => {
    const { pool, queries } = fakePool();
    await new PortalRepository(pool).findOwnModel(TENANT, USER, ID);
    const [statement] = dataStatements(queries);
    expect(statement!.text).toMatch(/uploaded_by_user_id = \$3/);
    expect(statement!.params).toEqual([TENANT, ID, USER]);
  });

  it('claimForOrder only claims the caller’s priced, unexpired quote at the shown total', async () => {
    const { pool, queries } = fakePool((text) =>
      text.startsWith('UPDATE quotes') ? { rows: [{}] } : { rows: [] },
    );
    const claimed = await new PortalRepository(pool).claimForOrder(TENANT, CRM, ID, 4500, USER);
    expect(claimed).toBe(true);
    const update = dataStatements(queries).find((q) => q.text.startsWith('UPDATE quotes'))!;
    expect(update.text).toMatch(/q\.customer_id = \$2 AND q\.source = 'portal'/);
    expect(update.text).toMatch(/q\.status = 'pending'/);
    expect(update.text).toMatch(/q\.estimate_source = 'slicer'/);
    expect(update.text).toMatch(/q\.total_cents = \$4/);
    expect(update.text).toMatch(/expires_at > now\(\)/);
    expect(update.params).toEqual([TENANT, CRM, ID, 4500, USER]);
  });

  it('every statement carries the tenant id', async () => {
    const { pool, queries } = fakePool();
    const repo = new PortalRepository(pool);
    await repo.findPortalCustomer(TENANT, USER);
    await repo.listMaterials(TENANT, ID);
    await repo.findQuotablePrinter(TENANT, ID);
    await repo.setPortalPrinter(TENANT, ID);
    await repo.ensureCrmCustomer(TENANT, USER, ID);
    for (const q of dataStatements(queries)) {
      expect(q.text, q.text).toMatch(/tenant_id/);
      expect(q.params, q.text).toContain(TENANT);
    }
  });
});

describe('PortalRepository.ensureCrmCustomer', () => {
  const portalRow = {
    id: 'pc-1',
    crm_customer_id: null,
    phone: '+20 100',
    company_name: null,
    email: 'ana@example.com',
    full_name: 'Ana',
  };

  it('returns null for a user with no portal account', async () => {
    const { pool } = fakePool();
    await expect(new PortalRepository(pool).ensureCrmCustomer(TENANT, USER, ID)).resolves.toBe(
      null,
    );
  });

  it('creates and links a CRM customer on the first quote', async () => {
    const { pool, queries } = fakePool((text) => {
      if (text.includes('FROM portal_customers pc')) return { rows: [portalRow] };
      if (text.startsWith('INSERT INTO customers')) return { rows: [{ id: CRM }] };
      return { rows: [] };
    });
    await expect(new PortalRepository(pool).ensureCrmCustomer(TENANT, USER, ID)).resolves.toBe(CRM);
    const insert = queries.find((q) => q.text.startsWith('INSERT INTO customers'))!;
    expect(insert.params).toEqual(
      expect.arrayContaining([TENANT, ID, 'Ana', 'ana@example.com', '+20 100']),
    );
    const link = queries.find((q) => q.text.startsWith('UPDATE portal_customers'))!;
    expect(link.params).toEqual([CRM, 'pc-1', TENANT]);
    // Never adopts an existing CRM record by email.
    expect(queries.some((q) => /FROM customers\s+WHERE[^]*email/i.test(q.text))).toBe(false);
  });

  it('reuses the linked CRM customer', async () => {
    const { pool, queries } = fakePool((text) => {
      if (text.includes('FROM portal_customers pc'))
        return { rows: [{ ...portalRow, crm_customer_id: CRM }] };
      if (text.startsWith('SELECT 1 FROM customers')) return { rows: [{}] };
      return { rows: [] };
    });
    await expect(new PortalRepository(pool).ensureCrmCustomer(TENANT, USER, ID)).resolves.toBe(CRM);
    expect(queries.some((q) => q.text.startsWith('INSERT INTO customers'))).toBe(false);
  });

  it('falls back to no email when another customer record already holds it', async () => {
    let inserts = 0;
    const queries: Recorded[] = [];
    const run = async (text: string, params: unknown[] = []) => {
      queries.push({ text, params });
      if (text.includes('FROM portal_customers pc')) return { rows: [portalRow], rowCount: 1 };
      if (text.startsWith('INSERT INTO customers')) {
        inserts += 1;
        if (inserts === 1) throw Object.assign(new Error('duplicate'), { code: '23505' });
        return { rows: [{ id: CRM }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    };
    const pool = {
      query: run,
      connect: async () => ({ query: run, release: () => undefined }),
    } as unknown as Pool;

    await expect(new PortalRepository(pool).ensureCrmCustomer(TENANT, USER, ID)).resolves.toBe(CRM);
    const [, second] = queries.filter((q) => q.text.startsWith('INSERT INTO customers'));
    expect(second!.params[3]).toBeNull();
    expect(queries.some((q) => q.text === 'ROLLBACK TO SAVEPOINT portal_crm_customer')).toBe(true);
  });
});
