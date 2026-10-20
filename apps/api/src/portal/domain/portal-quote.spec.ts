import { describe, expect, it } from 'vitest';

import {
  layerHeightFor,
  type PortalOrderRow,
  type PortalQuoteRow,
  portalOrderStatus,
  toPortalOrder,
  toPortalQuote,
} from './portal-quote';

const NOW = new Date('2026-10-21T12:00:00Z');

const row: PortalQuoteRow = {
  id: 'q1',
  quote_number: 'main-20261021-0001',
  status: 'pending',
  estimate_source: 'slicer',
  total_cents: 12_345,
  currency: 'EGP',
  quantity: 2,
  print_quality: 'standard',
  estimated_time_minutes: 80,
  estimated_weight_grams: 33,
  bounding_box_x_mm: '40.00',
  bounding_box_y_mm: '20.50',
  bounding_box_z_mm: '10.00',
  customer_notes: 'Black please',
  expires_at: '2026-10-24T12:00:00Z',
  created_at: new Date('2026-10-21T10:00:00Z'),
  model_filename: 'part.stl',
  material_id: 'm1',
  material_name: 'PLA Black',
  material_type: 'PLA',
  material_color: 'Black',
  material_color_code: '#111111',
  order_id: null,
  order_number: null,
};

describe('toPortalQuote', () => {
  it('exposes exactly the customer-safe fields', () => {
    // A row carrying internal columns (as if a query selected q.*) must not leak them.
    const leaky = {
      ...row,
      material_cost_cents: 100,
      subtotal_cents: 6_666,
      tax_cents: 777,
      pricing_breakdown: { profitMargin: 999 },
      slice_result: { estimate: {} },
      internal_notes: 'customer haggles',
      risk_factors: [],
    } as PortalQuoteRow;
    const view = toPortalQuote(leaky, NOW);
    expect(Object.keys(view).sort()).toEqual(
      [
        'id',
        'quote_number',
        'status',
        'model_filename',
        'material',
        'quality',
        'quantity',
        'total_cents',
        'currency',
        'print_time_minutes',
        'weight_grams',
        'dimensions_mm',
        'notes',
        'expires_at',
        'created_at',
        'order',
      ].sort(),
    );
    expect(JSON.stringify(view)).not.toMatch(/haggles|profitMargin|6666|777/);
    expect(view).toMatchObject({
      status: 'priced',
      total_cents: 12_345,
      print_time_minutes: 80,
      weight_grams: 33,
      dimensions_mm: { x: 40, y: 20.5, z: 10 },
      material: { id: 'm1', name: 'PLA Black', color: 'Black' },
    });
  });

  it('shows no numbers until the slicer has priced it', () => {
    const view = toPortalQuote({ ...row, status: 'draft', estimate_source: null }, NOW);
    expect(view).toMatchObject({
      status: 'unpriced',
      total_cents: null,
      print_time_minutes: null,
      weight_grams: null,
      dimensions_mm: null,
    });
  });

  it('maps lifecycle states', () => {
    expect(toPortalQuote({ ...row, expires_at: '2026-10-21T11:00:00Z' }, NOW).status).toBe(
      'expired',
    );
    expect(toPortalQuote({ ...row, status: 'approved' }, NOW).status).toBe('ordered');
    expect(toPortalQuote({ ...row, order_id: 'o1', order_number: 'X-1' }, NOW).status).toBe(
      'ordered',
    );
    expect(toPortalQuote({ ...row, status: 'rejected' }, NOW).status).toBe('declined');
  });
});

describe('layerHeightFor', () => {
  it('uses the presets on a 0.4 mm nozzle', () => {
    expect(layerHeightFor('draft', '0.40')).toBe(0.28);
    expect(layerHeightFor('standard', 0.4)).toBe(0.2);
    expect(layerHeightFor('fine', null)).toBe(0.12);
  });

  it('keeps layers within what the nozzle can print', () => {
    expect(layerHeightFor('draft', 0.25)).toBe(0.19);
    expect(layerHeightFor('fine', 0.8)).toBe(0.2);
  });
});

describe('toPortalOrder', () => {
  const order: PortalOrderRow = {
    id: 'o1',
    order_number: 'main-20261021-0001',
    status: 'accepted',
    production_status: 'not_started',
    delivery_status: 'not_shipped',
    total_cents: 5000,
    currency: 'EGP ',
    tracking_number: null,
    created_at: '2026-10-21T10:00:00Z',
    completed_at: null,
    delivered_at: null,
    quote_id: 'q1',
    quote_number: 'Q-1',
    quantity: 2,
    model_filename: 'part.stl',
  };

  it('maps shop statuses to customer stages', () => {
    expect(portalOrderStatus(order)).toBe('received');
    expect(portalOrderStatus({ ...order, production_status: 'queued' })).toBe('printing');
    expect(portalOrderStatus({ ...order, status: 'quality_check' })).toBe('printing');
    expect(portalOrderStatus({ ...order, status: 'completed' })).toBe('ready');
    expect(portalOrderStatus({ ...order, status: 'completed', delivery_status: 'shipped' })).toBe(
      'shipped',
    );
    expect(portalOrderStatus({ ...order, status: 'delivered' })).toBe('delivered');
    expect(portalOrderStatus({ ...order, status: 'cancelled' })).toBe('cancelled');
  });

  it('exposes no internal fields', () => {
    const view = toPortalOrder({ ...order, internal_notes: 'x' } as PortalOrderRow);
    expect(view).not.toHaveProperty('internal_notes');
    expect(view.currency).toBe('EGP');
  });
});
