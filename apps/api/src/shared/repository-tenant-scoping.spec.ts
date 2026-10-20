import type { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { AnalyticsRepository } from '../analytics/repositories/analytics.repository';
import { CustomerRepository } from '../customers/repositories/customer.repository';
import { MaterialRepository } from '../materials/repositories/material.repository';
import { MLRepository } from '../ml/repositories/ml.repository';
import { OrderRepository } from '../orders/repositories/order.repository';
import { PricingRepository } from '../pricing/repositories/pricing.repository';
import { PrinterRepository } from '../printers/repositories/printer.repository';
import { QuoteRepository } from '../quotes/repositories/quote.repository';

const TENANT = '11111111-1111-4111-8111-111111111111';
const ID = '22222222-2222-4222-8222-222222222222';

type RecordedQuery = { text: string; params: unknown[] };

/**
 * Records every statement sent through pool.query or a withTenantSession client.
 * `ownsParent` controls whether parent-ownership checks (`SELECT 1 FROM ...`) find a row.
 */
function fakePool(ownsParent = true): { pool: Pool; queries: RecordedQuery[] } {
  const queries: RecordedQuery[] = [];
  const run = async (text: string, params: unknown[] = []) => {
    queries.push({ text, params });
    const isOwnershipCheck = /^\s*SELECT 1 FROM/i.test(text);
    const rowCount = isOwnershipCheck && ownsParent ? 1 : 0;
    return { rows: rowCount ? [{ '?column?': 1 }] : [], rowCount };
  };
  const pool = {
    query: run,
    connect: async () => ({ query: run, release: () => undefined }),
  } as unknown as Pool;
  return { pool, queries };
}

const isSessionControl = (text: string) =>
  /^(BEGIN|COMMIT|ROLLBACK)$/.test(text.trim()) || text.includes('set_config');

/** Every data statement must filter on tenant_id and carry the caller's tenant id. */
function expectTenantScoped(queries: RecordedQuery[]): void {
  const data = queries.filter((q) => !isSessionControl(q.text));
  expect(data.length).toBeGreaterThan(0);
  for (const q of data) {
    expect(q.text, q.text).toMatch(/tenant_id/);
    expect(q.params, q.text).toContain(TENANT);
  }
}

function expectSessionTenant(queries: RecordedQuery[]): void {
  const setTenant = queries.find((q) => q.text.includes(`set_config('app.tenant_id'`));
  expect(setTenant?.params).toEqual([TENANT]);
}

type Case = [name: string, call: (pool: Pool) => Promise<unknown>, viaSession?: boolean];

const cases: Case[] = [
  ['printers.findById', (p) => new PrinterRepository(p).findById(ID, TENANT)],
  [
    'printers.list',
    (p) =>
      new PrinterRepository(p).list(
        { shopId: ID, status: 'active', technology: 'FDM', search: 'x' },
        TENANT,
      ),
  ],
  ['printers.update', (p) => new PrinterRepository(p).update(ID, { name: 'x' }, TENANT)],
  ['printers.delete', (p) => new PrinterRepository(p).delete(ID, TENANT)],
  [
    'printers.getProfilesByPrinter',
    (p) => new PrinterRepository(p).getProfilesByPrinter(ID, TENANT),
  ],
  [
    'printers.updateProfile',
    (p) => new PrinterRepository(p).updateProfile(ID, { name: 'x' }, TENANT),
  ],
  ['printers.deleteProfile', (p) => new PrinterRepository(p).deleteProfile(ID, TENANT)],
  [
    'printers.getCapabilitiesByPrinter',
    (p) => new PrinterRepository(p).getCapabilitiesByPrinter(ID, TENANT),
  ],
  [
    'printers.updateCapability',
    (p) => new PrinterRepository(p).updateCapability(ID, { capability_name: 'x' }, TENANT),
  ],
  ['printers.deleteCapability', (p) => new PrinterRepository(p).deleteCapability(ID, TENANT)],

  ['materials.findById', (p) => new MaterialRepository(p).findById(ID, TENANT)],
  [
    'materials.list',
    (p) =>
      new MaterialRepository(p).list({ materialType: 'PLA', isActive: true, search: 'x' }, TENANT),
  ],
  ['materials.update', (p) => new MaterialRepository(p).update(ID, { name: 'x' }, TENANT)],
  ['materials.delete', (p) => new MaterialRepository(p).delete(ID, TENANT)],
  [
    'materials.getCompatibilitiesByMaterial',
    (p) => new MaterialRepository(p).getCompatibilitiesByMaterial(ID, TENANT),
  ],
  [
    'materials.updateCompatibility',
    (p) => new MaterialRepository(p).updateCompatibility(ID, { notes: 'x' }, TENANT),
  ],
  [
    'materials.deleteCompatibility',
    (p) => new MaterialRepository(p).deleteCompatibility(ID, TENANT),
  ],

  ['orders.findById', (p) => new OrderRepository(p).findById(ID, TENANT)],
  ['orders.findByQuoteId', (p) => new OrderRepository(p).findByQuoteId(ID, TENANT)],
  ['orders.list', (p) => new OrderRepository(p).list({ status: 'pending', search: 'x' }, TENANT)],
  ['orders.update', (p) => new OrderRepository(p).update(ID, { status: 'pending' }, TENANT)],
  ['orders.getHistoryByOrder', (p) => new OrderRepository(p).getHistoryByOrder(ID, TENANT)],
  ['orders.getItemsByOrder', (p) => new OrderRepository(p).getItemsByOrder(ID, TENANT)],
  ['orders.updateItem', (p) => new OrderRepository(p).updateItem(ID, { quantity: 2 }, TENANT)],

  ['customers.findById', (p) => new CustomerRepository(p).findById(ID, TENANT)],
  [
    'customers.list',
    (p) => new CustomerRepository(p).list({ search: 'x', status: 'active' }, TENANT),
  ],
  ['customers.update', (p) => new CustomerRepository(p).update(ID, { name: 'x' }, TENANT)],
  ['customers.delete', (p) => new CustomerRepository(p).delete(ID, TENANT)],

  [
    'pricing.findApplicable',
    (p) =>
      new PricingRepository(p).findApplicable(TENANT, {
        shopId: ID,
        materialId: ID,
        printerId: ID,
      }),
  ],
  ['pricing.findById', (p) => new PricingRepository(p).findById(ID, TENANT)],
  ['pricing.list', (p) => new PricingRepository(p).list({ shop_id: ID }, TENANT)],
  ['pricing.update', (p) => new PricingRepository(p).update(ID, { priority: 1 }, TENANT)],
  ['pricing.delete', (p) => new PricingRepository(p).delete(ID, TENANT)],

  ['analytics.revenue', (p) => new AnalyticsRepository(p).getRevenueAnalytics(TENANT, ID)],
  ['analytics.materialUsage', (p) => new AnalyticsRepository(p).getMaterialUsageAnalytics(TENANT)],
  [
    'analytics.printerUtilization',
    (p) => new AnalyticsRepository(p).getPrinterUtilizationAnalytics(TENANT),
  ],
  ['analytics.orderStatus', (p) => new AnalyticsRepository(p).getOrderStatusAnalytics(TENANT)],
  ['analytics.customers', (p) => new AnalyticsRepository(p).getCustomerAnalytics(TENANT)],
  ['analytics.profitability', (p) => new AnalyticsRepository(p).getProfitabilityAnalytics(TENANT)],
  ['analytics.dailySummary', (p) => new AnalyticsRepository(p).getDailySummaryAnalytics(TENANT)],

  [
    'ml.updateDatasetExport',
    (p) => new MLRepository(p).updateDatasetExport(ID, { status: 'completed' }, TENANT),
  ],
  ['ml.getTrainingSamples', (p) => new MLRepository(p).getTrainingSamples(TENANT, ID)],
  ['ml.getDatasetExports', (p) => new MLRepository(p).getDatasetExports(TENANT)],
  ['ml.getModelPerformances', (p) => new MLRepository(p).getModelPerformances(TENANT)],

  ['quotes.findById', (p) => new QuoteRepository(p).findById(ID, TENANT), false],
  ['quotes.list', (p) => new QuoteRepository(p).list({ status: 'draft' }, TENANT), false],
  ['quotes.update', (p) => new QuoteRepository(p).update(ID, { status: 'draft' }, TENANT), false],
  ['quotes.delete', (p) => new QuoteRepository(p).delete(ID, TENANT), false],
];

describe('business repositories are tenant-scoped', () => {
  it.each(cases)('%s filters on the caller tenant', async (_name, call, viaSession = true) => {
    const { pool, queries } = fakePool();
    await call(pool);
    expectTenantScoped(queries);
    if (viaSession) {
      expectSessionTenant(queries);
    }
  });
});

type ChildCreate = [name: string, call: (pool: Pool) => Promise<unknown>, insertInto: string];

const childCreates: ChildCreate[] = [
  [
    'printers.createProfile',
    (p) =>
      new PrinterRepository(p).createProfile(
        ID,
        { name: 'x', material_type: 'PLA', layer_height_mm: 0.2, infill_percentage: 15 } as never,
        TENANT,
      ),
    'printer_profiles',
  ],
  [
    'printers.createCapability',
    (p) =>
      new PrinterRepository(p).createCapability(
        ID,
        { capability_type: 'x', capability_name: 'x', is_supported: true } as never,
        TENANT,
      ),
    'printer_capabilities',
  ],
  [
    'materials.createCompatibility',
    (p) =>
      new MaterialRepository(p).createCompatibility(
        ID,
        { printer_id: ID, is_compatible: true } as never,
        TENANT,
      ),
    'material_printer_compatibility',
  ],
  [
    'orders.createHistory',
    (p) =>
      new OrderRepository(p).createHistory(
        ID,
        { new_status: 'pending', status_type: 'order' } as never,
        TENANT,
      ),
    'order_history',
  ],
  [
    'orders.createItem',
    (p) =>
      new OrderRepository(p).createItem(
        ID,
        { item_name: 'x', quantity: 1, unit_price_cents: 100 } as never,
        TENANT,
      ),
    'order_items',
  ],
  [
    'ml.createFeatureVector',
    (p) =>
      new MLRepository(p).createFeatureVector(
        { training_sample_id: ID, feature_version: '1.0' } as never,
        TENANT,
      ),
    'feature_vectors',
  ],
  [
    'quotes.addHistory',
    (p) => new QuoteRepository(p).addHistory(ID, 'draft', 'pending', null, null, TENANT),
    'quote_history',
  ],
];

describe('child-table writes check the parent belongs to the tenant', () => {
  it.each(childCreates)('%s checks parent ownership with the tenant id', async (_n, call) => {
    const { pool, queries } = fakePool(true);
    await call(pool).catch(() => undefined);
    const checks = queries.filter((q) => /^\s*SELECT 1 FROM/i.test(q.text));
    expect(checks.length).toBeGreaterThan(0);
    for (const check of checks) {
      expect(check.text).toMatch(/tenant_id = \$2/);
      expect(check.params[1]).toBe(TENANT);
    }
    expectSessionTenant(queries);
  });

  it.each(childCreates)(
    '%s does not insert when the parent belongs to another tenant',
    async (_n, call, table) => {
      const { pool, queries } = fakePool(false);
      await call(pool).catch(() => undefined);
      expect(queries.some((q) => q.text.includes(`INSERT INTO ${table}`))).toBe(false);
    },
  );

  it.each(childCreates)('%s inserts when the parent is owned', async (_n, call, table) => {
    const { pool, queries } = fakePool(true);
    await call(pool).catch(() => undefined);
    expect(queries.some((q) => q.text.includes(`INSERT INTO ${table}`))).toBe(true);
  });
});
