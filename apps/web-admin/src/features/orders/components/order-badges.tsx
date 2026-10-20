import { Badge, type BadgeTone } from '../../../shared/ui';
import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  PRODUCTION_STATUS_LABEL,
  type OrderStatus,
  type PaymentStatus,
  type ProductionStatus,
} from '../model/order-types';

const ORDER_TONE: Record<OrderStatus, BadgeTone> = {
  pending: 'neutral',
  accepted: 'accent',
  production: 'accent',
  printing: 'accent',
  quality_check: 'warning',
  completed: 'success',
  delivered: 'success',
  cancelled: 'danger',
};

const PAYMENT_TONE: Record<PaymentStatus, BadgeTone> = {
  pending: 'warning',
  paid: 'success',
  partial: 'warning',
  refunded: 'neutral',
  failed: 'danger',
};

const PRODUCTION_TONE: Record<ProductionStatus, BadgeTone> = {
  not_started: 'neutral',
  queued: 'neutral',
  in_progress: 'accent',
  paused: 'warning',
  completed: 'success',
  failed: 'danger',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={ORDER_TONE[status]}>{ORDER_STATUS_LABEL[status]}</Badge>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={PAYMENT_TONE[status]}>{PAYMENT_STATUS_LABEL[status]}</Badge>;
}

export function ProductionBadge({ status }: { status: ProductionStatus }) {
  return <Badge tone={PRODUCTION_TONE[status]}>{PRODUCTION_STATUS_LABEL[status]}</Badge>;
}
