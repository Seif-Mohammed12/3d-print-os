import { type Stock, StockTag } from '../../../shared/ui';
import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  PRODUCTION_STATUS_LABEL,
  type OrderStatus,
  type PaymentStatus,
  type ProductionStatus,
} from '../model/order-types';

const ORDER_STOCK: Record<OrderStatus, Stock> = {
  pending: 'draft',
  accepted: 'approved',
  production: 'approved',
  printing: 'printing',
  quality_check: 'qc',
  completed: 'done',
  delivered: 'done',
  cancelled: 'void',
};

const PAYMENT_STOCK: Record<PaymentStatus, Stock> = {
  pending: 'quoted',
  paid: 'approved',
  partial: 'quoted',
  refunded: 'void',
  failed: 'failed',
};

const PRODUCTION_STOCK: Record<ProductionStatus, Stock> = {
  not_started: 'draft',
  queued: 'approved',
  in_progress: 'printing',
  paused: 'quoted',
  completed: 'done',
  failed: 'failed',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <StockTag stock={ORDER_STOCK[status]}>{ORDER_STATUS_LABEL[status]}</StockTag>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <StockTag stock={PAYMENT_STOCK[status]}>{PAYMENT_STATUS_LABEL[status]}</StockTag>;
}

export function ProductionBadge({ status }: { status: ProductionStatus }) {
  return <StockTag stock={PRODUCTION_STOCK[status]}>{PRODUCTION_STATUS_LABEL[status]}</StockTag>;
}

export function orderStock(status: OrderStatus): Stock {
  return ORDER_STOCK[status];
}

export function productionStock(status: ProductionStatus): Stock {
  return PRODUCTION_STOCK[status];
}
