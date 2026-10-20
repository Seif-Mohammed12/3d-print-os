import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RequestAuthContext } from '../identity/auth.types';
import type { Quote } from '../quotes/repositories/quote.repository';
import type { QuoteService } from '../quotes/services/quote.service';
import { AppError } from '../shared/errors/app.error';
import type { PortalQuoteRow } from './domain/portal-quote';
import type { PortalRepository } from './portal.repository';
import { PortalService } from './portal.service';

const TENANT = 't-1';
const PRINTER = {
  id: 'printer-1',
  shop_id: 'shop-1',
  name: 'Prusa MK4',
  nozzle_diameter_mm: '0.40',
  build_volume_x_mm: '250',
  build_volume_y_mm: '210',
  build_volume_z_mm: '220',
};
const PLA = {
  id: 'mat-pla',
  name: 'PLA',
  material_type: 'PLA',
  color: 'Black',
  color_code: '#000',
};
const PETG = { id: 'mat-petg', name: 'PETG', material_type: 'PETG', color: null, color_code: null };

const alice: RequestAuthContext = {
  userId: 'u-alice',
  tenantId: TENANT,
  roles: ['customer'],
  permissions: [],
};
const bob: RequestAuthContext = { ...alice, userId: 'u-bob' };
const staff: RequestAuthContext = { ...alice, userId: 'u-staff', roles: ['owner'] };

/** Fields a customer must never receive. */
const INTERNAL_FIELDS = [
  'material_cost_cents',
  'machine_time_cost_cents',
  'electricity_cost_cents',
  'maintenance_cost_cents',
  'post_processing_cost_cents',
  'failure_risk_cost_cents',
  'subtotal_cents',
  'tax_cents',
  'pricing_breakdown',
  'slice_result',
  'internal_notes',
  'risk_factors',
  'risk_percentage',
  'difficulty_score',
  'customer_id',
  'printer_id',
];

function quoteRow(overrides: Partial<PortalQuoteRow> = {}): PortalQuoteRow {
  return {
    id: 'q-alice',
    quote_number: 'main-20261021-0001',
    status: 'pending',
    estimate_source: 'slicer',
    total_cents: 45_600,
    currency: 'EGP',
    quantity: 2,
    print_quality: 'standard',
    estimated_time_minutes: 95,
    estimated_weight_grams: 41,
    bounding_box_x_mm: '40.00',
    bounding_box_y_mm: '30.00',
    bounding_box_z_mm: '12.50',
    customer_notes: null,
    expires_at: new Date(Date.now() + 3_600_000),
    created_at: new Date('2026-10-21T10:00:00Z'),
    model_filename: 'bracket.stl',
    material_id: PLA.id,
    material_name: PLA.name,
    material_type: PLA.material_type,
    material_color: PLA.color,
    material_color_code: PLA.color_code,
    order_id: null,
    order_number: null,
    ...overrides,
  };
}

/**
 * In-memory stand-in for PortalRepository with two customers in one tenant. Lookups are
 * keyed by the CRM customer id the service passes, like the real SQL.
 */
function setup() {
  const portalCustomers: Record<string, { id: string; crmCustomerId: string | null }> = {
    'u-alice': { id: 'pc-alice', crmCustomerId: 'crm-alice' },
    'u-bob': { id: 'pc-bob', crmCustomerId: 'crm-bob' },
  };
  const quotesByCustomer: Record<string, PortalQuoteRow[]> = {
    'crm-alice': [quoteRow()],
    'crm-bob': [quoteRow({ id: 'q-bob', total_cents: 99_900 })],
  };
  const models: Record<string, { id: string; status: string; owner: string }> = {
    'model-alice': { id: 'model-alice', status: 'uploaded', owner: 'u-alice' },
    'model-bob': { id: 'model-bob', status: 'uploaded', owner: 'u-bob' },
  };

  const repo = {
    findPortalCustomer: vi.fn(
      async (_t: string, userId: string) => portalCustomers[userId] ?? null,
    ),
    ensureCrmCustomer: vi.fn(
      async (_t: string, userId: string) => portalCustomers[userId]?.crmCustomerId ?? null,
    ),
    getQuotingSetup: vi.fn(async () => ({
      configuredPrinterId: null,
      printer: PRINTER,
      currency: 'EGP',
      quoteValidityHours: 72,
    })),
    listMaterials: vi.fn(async () => [PLA, PETG]),
    findMaterial: vi.fn(
      async (_t: string, _p: string, id: string) => [PLA, PETG].find((m) => m.id === id) ?? null,
    ),
    findOwnModel: vi.fn(async (_t: string, userId: string, modelId: string) => {
      const model = models[modelId];
      return model && model.owner === userId ? { id: model.id, status: model.status } : null;
    }),
    listQuotes: vi.fn(async (_t: string, crm: string) => quotesByCustomer[crm] ?? []),
    findQuote: vi.fn(
      async (_t: string, crm: string, id: string) =>
        (quotesByCustomer[crm] ?? []).find((q) => q.id === id) ?? null,
    ),
    claimForOrder: vi.fn(async (_t: string, crm: string, id: string, expected: number) =>
      (quotesByCustomer[crm] ?? []).some((q) => q.id === id && q.total_cents === expected),
    ),
    listOrders: vi.fn(async () => []),
    findQuotablePrinter: vi.fn(async () => PRINTER),
    setPortalPrinter: vi.fn(async () => undefined),
  };

  const storedQuote = {
    id: 'q-alice',
    material_id: PLA.id,
    printer_id: PRINTER.id,
    layer_height_mm: '0.200',
  } as unknown as Quote;
  const quotes = {
    create: vi.fn(async (data: { customer_id: string }) => {
      const created = quoteRow({ id: 'q-new', status: 'draft', estimate_source: null });
      (quotesByCustomer[data.customer_id] ??= []).push(created);
      return { id: 'q-new' } as Quote;
    }),
    analyzeQuote: vi.fn(async () => {
      const created = quotesByCustomer['crm-alice']!.find((q) => q.id === 'q-new');
      if (created) {
        created.estimate_source = 'slicer';
        created.status = 'pending';
      }
      return {} as Quote;
    }),
    update: vi.fn(async () => ({}) as Quote),
    findById: vi.fn(async () => storedQuote),
    delete: vi.fn(async () => undefined),
    convertToOrder: vi.fn(async () => ({ id: 'order-1' })),
  };

  const service = new PortalService(
    repo as unknown as PortalRepository,
    quotes as unknown as QuoteService,
  );
  return { service, repo, quotes, quotesByCustomer };
}

describe('PortalService access', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup();
  });

  it('refuses accounts without a portal customer record (staff) on every endpoint', async () => {
    const choices = { materialId: PLA.id, quality: 'standard' as const, quantity: 1 };
    const calls = [
      () => ctx.service.getQuoteOptions(staff),
      () => ctx.service.listQuotes(staff),
      () => ctx.service.findQuote(staff, 'q-alice'),
      () => ctx.service.createQuote(staff, { ...choices, modelFileId: 'model-alice' }),
      () => ctx.service.repriceQuote(staff, 'q-alice', choices),
      () => ctx.service.acceptQuote(staff, 'q-alice', 45_600),
      () => ctx.service.listOrders(staff),
    ];
    for (const call of calls) {
      await expect(call()).rejects.toBeInstanceOf(ForbiddenException);
    }
    expect(ctx.quotes.create).not.toHaveBeenCalled();
    expect(ctx.quotes.convertToOrder).not.toHaveBeenCalled();
  });

  it("lists only the caller's own quotes", async () => {
    const quotes = await ctx.service.listQuotes(alice);
    expect(quotes.map((q) => q.id)).toEqual(['q-alice']);
    expect(ctx.repo.listQuotes).toHaveBeenCalledWith(TENANT, 'crm-alice');
  });

  it("cannot read, reprice or accept another customer's quote", async () => {
    await expect(ctx.service.findQuote(alice, 'q-bob')).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      ctx.service.repriceQuote(alice, 'q-bob', {
        materialId: PLA.id,
        quality: 'standard',
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(ctx.service.acceptQuote(alice, 'q-bob', 99_900)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(ctx.quotes.analyzeQuote).not.toHaveBeenCalled();
    expect(ctx.repo.claimForOrder).not.toHaveBeenCalled();
    expect(ctx.quotes.convertToOrder).not.toHaveBeenCalled();
  });

  it('cannot quote a model another customer uploaded', async () => {
    await expect(
      ctx.service.createQuote(alice, {
        modelFileId: 'model-bob',
        materialId: PLA.id,
        quality: 'standard',
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(ctx.repo.findOwnModel).toHaveBeenCalledWith(TENANT, 'u-alice', 'model-bob');
    expect(ctx.quotes.create).not.toHaveBeenCalled();
  });

  it('refuses materials the shop does not offer', async () => {
    await expect(
      ctx.service.createQuote(alice, {
        modelFileId: 'model-alice',
        materialId: 'mat-secret',
        quality: 'standard',
        quantity: 1,
      }),
    ).rejects.toMatchObject({ code: 'portal.material_unavailable', statusCode: 422 });
  });

  it('a customer with no quotes yet sees empty lists', async () => {
    ctx.repo.findPortalCustomer.mockResolvedValueOnce({ id: 'pc-new', crmCustomerId: null });
    await expect(ctx.service.listQuotes(alice)).resolves.toEqual([]);
  });
});

describe('PortalService pricing', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup();
  });

  it('creates a portal quote for the caller and prices it with the slicer', async () => {
    const view = await ctx.service.createQuote(alice, {
      modelFileId: 'model-alice',
      materialId: PLA.id,
      quality: 'fine',
      quantity: 3,
      notes: '  needed Friday ',
    });

    expect(ctx.repo.ensureCrmCustomer).toHaveBeenCalledWith(TENANT, 'u-alice', 'shop-1');
    expect(ctx.quotes.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT,
        shop_id: 'shop-1',
        customer_id: 'crm-alice',
        model_id: 'model-alice',
        material_id: PLA.id,
        printer_id: PRINTER.id,
        layer_height_mm: 0.12,
        print_quality: 'fine',
        quantity: 3,
        source: 'portal',
        customer_notes: 'needed Friday',
        created_by: 'u-alice',
      }),
    );
    expect(ctx.quotes.analyzeQuote).toHaveBeenCalledWith('q-new', TENANT, 'u-alice', {
      quantity: 3,
    });
    expect(ctx.quotes.update).toHaveBeenCalledWith(
      'q-new',
      expect.objectContaining({ status: 'pending', expires_at: expect.any(Date) }),
      TENANT,
      'u-alice',
    );
    expect(view.status).toBe('priced');
    for (const field of INTERNAL_FIELDS) {
      expect(view).not.toHaveProperty(field);
    }
  });

  it('hides shop setup problems from the customer and drops the failed draft', async () => {
    ctx.quotes.analyzeQuote.mockRejectedValueOnce(
      new AppError({
        code: 'quote.pricing_rule_missing',
        message: 'No active pricing rule applies to this shop, printer and material',
        statusCode: 422,
      }),
    );
    const attempt = ctx.service.createQuote(alice, {
      modelFileId: 'model-alice',
      materialId: PETG.id,
      quality: 'standard',
      quantity: 1,
    });
    const error = await attempt.catch((e: unknown) => e);
    expect(error).toMatchObject({ code: 'portal.quote_unavailable', statusCode: 422 });
    expect((error as Error).message).not.toMatch(/pricing rule/);
    expect(ctx.quotes.delete).toHaveBeenCalledWith('q-new', TENANT);
  });

  it('reprices a quantity change from the stored slice', async () => {
    await ctx.service.repriceQuote(alice, 'q-alice', {
      materialId: PLA.id,
      quality: 'standard',
      quantity: 5,
    });
    expect(ctx.quotes.update).not.toHaveBeenCalledWith(
      'q-alice',
      expect.objectContaining({ material_id: expect.anything() }),
      TENANT,
      'u-alice',
    );
    expect(ctx.quotes.analyzeQuote).toHaveBeenCalledWith('q-alice', TENANT, 'u-alice', {
      quantity: 5,
      reuseSlice: true,
    });
  });

  it('re-slices when the material or quality changes', async () => {
    await ctx.service.repriceQuote(alice, 'q-alice', {
      materialId: PETG.id,
      quality: 'draft',
      quantity: 1,
    });
    expect(ctx.quotes.update).toHaveBeenCalledWith(
      'q-alice',
      {
        material_id: PETG.id,
        printer_id: PRINTER.id,
        layer_height_mm: 0.28,
        print_quality: 'draft',
      },
      TENANT,
      'u-alice',
    );
    expect(ctx.quotes.analyzeQuote).toHaveBeenCalledWith('q-alice', TENANT, 'u-alice', {
      quantity: 1,
      reuseSlice: false,
    });
  });

  it('a failed reprice leaves the quote unorderable', async () => {
    ctx.quotes.analyzeQuote.mockRejectedValueOnce(new Error('slicer down'));
    await expect(
      ctx.service.repriceQuote(alice, 'q-alice', {
        materialId: PLA.id,
        quality: 'standard',
        quantity: 2,
      }),
    ).rejects.toThrow('slicer down');
    expect(ctx.quotes.update).toHaveBeenCalledWith(
      'q-alice',
      { status: 'draft', estimate_source: null },
      TENANT,
      'u-alice',
    );
  });

  it('refuses to reprice an ordered quote', async () => {
    ctx.quotesByCustomer['crm-alice']![0]!.status = 'approved';
    await expect(
      ctx.service.repriceQuote(alice, 'q-alice', {
        materialId: PLA.id,
        quality: 'standard',
        quantity: 1,
      }),
    ).rejects.toMatchObject({ code: 'portal.quote_closed', statusCode: 409 });
  });
});

describe('PortalService ordering', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => {
    ctx = setup();
  });

  it('accepting at the shown price creates the shop order', async () => {
    await ctx.service.acceptQuote(alice, 'q-alice', 45_600, ' Black, by Friday ');
    expect(ctx.quotes.update).toHaveBeenCalledWith(
      'q-alice',
      { customer_notes: 'Black, by Friday' },
      TENANT,
      'u-alice',
    );
    expect(ctx.repo.claimForOrder).toHaveBeenCalledWith(
      TENANT,
      'crm-alice',
      'q-alice',
      45_600,
      'u-alice',
    );
    expect(ctx.quotes.convertToOrder).toHaveBeenCalledWith('q-alice', TENANT, 'u-alice');
  });

  it('refuses when the price changed since the customer saw it', async () => {
    await expect(ctx.service.acceptQuote(alice, 'q-alice', 10_000)).rejects.toMatchObject({
      code: 'portal.price_changed',
      statusCode: 409,
    });
    expect(ctx.quotes.convertToOrder).not.toHaveBeenCalled();
  });

  it('refuses an expired price', async () => {
    ctx.quotesByCustomer['crm-alice']![0]!.expires_at = new Date(Date.now() - 1000);
    ctx.repo.claimForOrder.mockResolvedValueOnce(false);
    await expect(ctx.service.acceptQuote(alice, 'q-alice', 45_600)).rejects.toMatchObject({
      code: 'portal.quote_expired',
    });
  });

  it('accepting twice returns the existing order instead of a second one', async () => {
    ctx.quotesByCustomer['crm-alice']![0]!.order_id = 'order-1';
    ctx.quotesByCustomer['crm-alice']![0]!.order_number = 'main-20261021-0001';
    const view = await ctx.service.acceptQuote(alice, 'q-alice', 45_600);
    expect(view.order).toEqual({ id: 'order-1', order_number: 'main-20261021-0001' });
    expect(ctx.repo.claimForOrder).not.toHaveBeenCalled();
    expect(ctx.quotes.convertToOrder).not.toHaveBeenCalled();
  });
});

describe('PortalService shop settings', () => {
  it('only accepts a quotable printer', async () => {
    const ctx = setup();
    ctx.repo.findQuotablePrinter.mockResolvedValueOnce(null as never);
    await expect(ctx.service.updateSettings(TENANT, 'printer-sla')).rejects.toMatchObject({
      code: 'portal.printer_not_quotable',
    });
    expect(ctx.repo.setPortalPrinter).not.toHaveBeenCalled();

    await ctx.service.updateSettings(TENANT, null);
    expect(ctx.repo.setPortalPrinter).toHaveBeenCalledWith(TENANT, null);
  });
});

describe('PortalService options', () => {
  it('lists materials and qualities without any cost data', async () => {
    const ctx = setup();
    const options = await ctx.service.getQuoteOptions(bob);
    expect(options.available).toBe(true);
    expect(options.printer).toEqual({
      name: 'Prusa MK4',
      build_volume_mm: { x: 250, y: 210, z: 220 },
    });
    expect(options.materials[0]).toEqual({
      id: PLA.id,
      name: 'PLA',
      type: 'PLA',
      color: 'Black',
      color_code: '#000',
    });
    expect(options.qualities.map((q) => q.code)).toEqual(['draft', 'standard', 'fine']);
    expect(JSON.stringify(options)).not.toMatch(/price|cost|margin/i);
  });
});
