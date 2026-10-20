/**
 * What a portal customer may see of a quote or an order. The views are built field by field
 * from purpose-made row types, so cost lines, margin, pricing rules, slicer output and
 * internal notes can never reach the portal by accident.
 */

type Numeric = number | string | null | undefined;

export const PRINT_QUALITIES = ['draft', 'standard', 'fine'] as const;
export type PrintQuality = (typeof PRINT_QUALITIES)[number];

export const MAX_PORTAL_QUANTITY = 100;

const QUALITY_PRESETS: Record<
  PrintQuality,
  { label: string; description: string; layerHeightMm: number }
> = {
  draft: { label: 'Draft', description: 'Fastest, visible layer lines', layerHeightMm: 0.28 },
  standard: { label: 'Standard', description: 'Good finish for most parts', layerHeightMm: 0.2 },
  fine: { label: 'Fine', description: 'Smoothest surface, slower', layerHeightMm: 0.12 },
};

function num(value: Numeric): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Layer height for a quality on this nozzle: a nozzle prints 25–75% of its diameter. */
export function layerHeightFor(quality: PrintQuality, nozzleDiameterMm: Numeric): number {
  const nozzle = num(nozzleDiameterMm) ?? 0.4;
  const preset = QUALITY_PRESETS[quality].layerHeightMm;
  const clamped = Math.min(Math.max(preset, nozzle * 0.25), nozzle * 0.75);
  return Math.round(clamped * 100) / 100;
}

export function qualityOptions(nozzleDiameterMm: Numeric) {
  return PRINT_QUALITIES.map((code) => ({
    code,
    label: QUALITY_PRESETS[code].label,
    description: QUALITY_PRESETS[code].description,
    layer_height_mm: layerHeightFor(code, nozzleDiameterMm),
  }));
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

/** The only quote columns the portal repository selects. */
export type PortalQuoteRow = {
  id: string;
  quote_number: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
  estimate_source: 'slicer' | null;
  total_cents: number;
  currency: string;
  quantity: number;
  print_quality: PrintQuality | null;
  estimated_time_minutes: number;
  estimated_weight_grams: number;
  bounding_box_x_mm: Numeric;
  bounding_box_y_mm: Numeric;
  bounding_box_z_mm: Numeric;
  customer_notes: string | null;
  expires_at: Date | string | null;
  created_at: Date | string;
  model_filename: string | null;
  material_id: string | null;
  material_name: string | null;
  material_type: string | null;
  material_color: string | null;
  material_color_code: string | null;
  order_id: string | null;
  order_number: string | null;
};

export type PortalQuoteStatus = 'unpriced' | 'priced' | 'expired' | 'ordered' | 'declined';

export type PortalQuoteView = {
  id: string;
  quote_number: string;
  status: PortalQuoteStatus;
  model_filename: string | null;
  material: {
    id: string;
    name: string;
    type: string | null;
    color: string | null;
    color_code: string | null;
  } | null;
  quality: PrintQuality | null;
  quantity: number;
  /** Price for all copies, tax included, in minor units. Null until priced. */
  total_cents: number | null;
  currency: string;
  /** Per copy. */
  print_time_minutes: number | null;
  /** Per copy. */
  weight_grams: number | null;
  dimensions_mm: { x: number; y: number; z: number } | null;
  notes: string | null;
  expires_at: string | null;
  created_at: string;
  order: { id: string; order_number: string } | null;
};

function iso(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function isExpired(expiresAt: Date | string | null, now: Date = new Date()): boolean {
  return expiresAt !== null && new Date(expiresAt).getTime() <= now.getTime();
}

export function portalQuoteStatus(row: PortalQuoteRow, now: Date = new Date()): PortalQuoteStatus {
  if (row.status === 'approved' || row.status === 'completed' || row.order_id) {
    return 'ordered';
  }
  if (row.status === 'rejected') {
    return 'declined';
  }
  if (row.estimate_source !== 'slicer') {
    return 'unpriced';
  }
  return isExpired(row.expires_at, now) ? 'expired' : 'priced';
}

export function toPortalQuote(row: PortalQuoteRow, now: Date = new Date()): PortalQuoteView {
  const priced = row.estimate_source === 'slicer';
  const x = num(row.bounding_box_x_mm);
  const y = num(row.bounding_box_y_mm);
  const z = num(row.bounding_box_z_mm);
  return {
    id: row.id,
    quote_number: row.quote_number,
    status: portalQuoteStatus(row, now),
    model_filename: row.model_filename,
    material:
      row.material_id && row.material_name
        ? {
            id: row.material_id,
            name: row.material_name,
            type: row.material_type,
            color: row.material_color,
            color_code: row.material_color_code,
          }
        : null,
    quality: row.print_quality,
    quantity: row.quantity,
    total_cents: priced ? row.total_cents : null,
    currency: row.currency.trim(),
    print_time_minutes: priced ? row.estimated_time_minutes : null,
    weight_grams: priced ? row.estimated_weight_grams : null,
    dimensions_mm: priced && x !== null && y !== null && z !== null ? { x, y, z } : null,
    notes: row.customer_notes,
    expires_at: iso(row.expires_at),
    created_at: iso(row.created_at) as string,
    order:
      row.order_id && row.order_number
        ? { id: row.order_id, order_number: row.order_number }
        : null,
  };
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/** The only order columns the portal repository selects. */
export type PortalOrderRow = {
  id: string;
  order_number: string;
  status: string;
  production_status: string;
  delivery_status: string;
  total_cents: number;
  currency: string;
  tracking_number: string | null;
  created_at: Date | string;
  completed_at: Date | string | null;
  delivered_at: Date | string | null;
  quote_id: string | null;
  quote_number: string | null;
  quantity: number | null;
  model_filename: string | null;
};

export type PortalOrderStatus =
  'received' | 'printing' | 'ready' | 'shipped' | 'delivered' | 'cancelled';

export type PortalOrderView = {
  id: string;
  order_number: string;
  status: PortalOrderStatus;
  total_cents: number;
  currency: string;
  quantity: number | null;
  model_filename: string | null;
  quote_number: string | null;
  tracking_number: string | null;
  created_at: string;
  completed_at: string | null;
  delivered_at: string | null;
};

export function portalOrderStatus(row: PortalOrderRow): PortalOrderStatus {
  if (row.status === 'cancelled') {
    return 'cancelled';
  }
  if (row.status === 'delivered' || row.delivery_status === 'delivered') {
    return 'delivered';
  }
  if (row.delivery_status === 'shipped') {
    return 'shipped';
  }
  if (row.status === 'completed') {
    return 'ready';
  }
  if (
    ['production', 'printing', 'quality_check'].includes(row.status) ||
    ['queued', 'in_progress', 'paused'].includes(row.production_status)
  ) {
    return 'printing';
  }
  return 'received';
}

export function toPortalOrder(row: PortalOrderRow): PortalOrderView {
  return {
    id: row.id,
    order_number: row.order_number,
    status: portalOrderStatus(row),
    total_cents: row.total_cents,
    currency: row.currency.trim(),
    quantity: row.quantity,
    model_filename: row.model_filename,
    quote_number: row.quote_number,
    tracking_number: row.tracking_number,
    created_at: iso(row.created_at) as string,
    completed_at: iso(row.completed_at),
    delivered_at: iso(row.delivered_at),
  };
}
