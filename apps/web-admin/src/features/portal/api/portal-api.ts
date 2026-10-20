import { http } from '../../../shared/api/http';

export type PrintQuality = 'draft' | 'standard' | 'fine';

export type PortalMaterial = {
  id: string;
  name: string;
  type: string;
  color: string | null;
  color_code: string | null;
};

export type PortalQuoteOptions = {
  /** False when the shop hasn't set up online quoting (no printer or no materials). */
  available: boolean;
  printer: {
    name: string;
    build_volume_mm: { x: number | null; y: number | null; z: number | null };
  } | null;
  materials: PortalMaterial[];
  qualities: Array<{
    code: PrintQuality;
    label: string;
    description: string;
    layer_height_mm: number;
  }>;
  max_quantity: number;
  currency: string;
};

/** Money is integer minor units, like the rest of the API. */
export type PortalQuote = {
  id: string;
  quote_number: string;
  status: 'unpriced' | 'priced' | 'expired' | 'ordered' | 'declined';
  model_filename: string | null;
  material: PortalMaterial | null;
  quality: PrintQuality | null;
  quantity: number;
  /** All copies, tax included. */
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

export type PortalOrder = {
  id: string;
  order_number: string;
  status: 'received' | 'printing' | 'ready' | 'shipped' | 'delivered' | 'cancelled';
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

export type PortalQuoteChoices = {
  materialId: string;
  quality: PrintQuality;
  quantity: number;
};

export const portalApi = {
  quoteOptions: () => http.get<PortalQuoteOptions>('/portal/quote-options'),
  quotes: () => http.get<PortalQuote[]>('/portal/quotes'),
  orders: () => http.get<PortalOrder[]>('/portal/orders'),
  /** Create a quote for an uploaded model and price it with the slicer. */
  createQuote: (input: PortalQuoteChoices & { modelFileId: string; notes?: string }) =>
    http.post<PortalQuote>('/portal/quotes', input),
  /** Change material, quality or quantity and get the new price. */
  repriceQuote: (id: string, input: PortalQuoteChoices) =>
    http.post<PortalQuote>(`/portal/quotes/${id}/price`, input),
  /** Order at the price the customer was shown; refused (409) if it has changed. */
  acceptQuote: (id: string, input: { expectedTotalCents: number; notes?: string }) =>
    http.post<PortalQuote>(`/portal/quotes/${id}/accept`, input),
};

/** Staff side: the printer portal quotes are sliced and priced on. */
export type PortalSettings = {
  /** The shop's pick; null means "oldest active FDM printer". */
  portal_printer_id: string | null;
  /** The printer actually used right now, if any is quotable. */
  effective_printer: { id: string; name: string } | null;
};

export const portalSettingsApi = {
  get: () => http.get<PortalSettings>('/portal-settings'),
  update: (printerId: string | null) => http.put<PortalSettings>('/portal-settings', { printerId }),
};
