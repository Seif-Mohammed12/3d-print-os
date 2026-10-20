export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'production'
  | 'printing'
  | 'quality_check'
  | 'completed'
  | 'delivered'
  | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'refunded' | 'failed';
export type ProductionStatus =
  'not_started' | 'queued' | 'in_progress' | 'paused' | 'completed' | 'failed';
export type DeliveryStatus = 'not_shipped' | 'processing' | 'shipped' | 'delivered' | 'returned';

export type Order = {
  id: string;
  shop_id: string;
  customer_id: string;
  customer_name?: string | null;
  quote_id: string;
  order_number: string;
  status: OrderStatus;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  payment_status: PaymentStatus;
  paid_amount_cents: number;
  payment_method: string | null;
  production_status: ProductionStatus;
  printer_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  delivery_status: DeliveryStatus;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  internal_notes: string | null;
  customer_notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderHistoryEntry = {
  id: string;
  old_status: string | null;
  new_status: string;
  status_type: string;
  changed_by: string | null;
  notes: string | null;
  changed_at: string;
};

export type UpdateOrderInput = {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paidAmountCents?: number;
  paymentMethod?: string;
  productionStatus?: ProductionStatus;
  printerId?: string;
  deliveryStatus?: DeliveryStatus;
  trackingNumber?: string;
  internalNotes?: string;
  cancellationReason?: string;
};

export type PrintOutcome = {
  actual_print_minutes: number | string | null;
  actual_filament_g: number | string | null;
  estimated_print_time_s: number | string;
  estimated_filament_g: number | string;
  notes: string | null;
  recorded_at: string;
};

export type RecordPrintOutcomeInput = {
  actualPrintMinutes?: number;
  actualFilamentGrams?: number;
  notes?: string;
};

export type OrderListParams = {
  status?: OrderStatus;
  productionStatus?: ProductionStatus;
  customerId?: string;
  search?: string;
  page?: number;
  per_page?: number;
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  production: 'In production',
  printing: 'Printing',
  quality_check: 'Quality check',
  completed: 'Completed',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const PRODUCTION_STATUS_LABEL: Record<ProductionStatus, string> = {
  not_started: 'Not started',
  queued: 'Queued',
  in_progress: 'Printing',
  paused: 'Paused',
  completed: 'Printed',
  failed: 'Failed',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'Unpaid',
  paid: 'Paid',
  partial: 'Partly paid',
  refunded: 'Refunded',
  failed: 'Failed',
};

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  not_shipped: 'Not shipped',
  processing: 'Packing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  returned: 'Returned',
};
