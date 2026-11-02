import { StageLine, type StageLineState } from '../../../shared/ui/stage-line';
import type { Order } from '../model/order-types';

/** Where an order can be, in the order it gets there. */
export const ORDER_STAGES = ['Accepted', 'Queued', 'Printing', 'QC', 'Ready', 'Delivered'] as const;

export type OrderStage = StageLineState;

/** The stage an order has reached, read from its order and production status. */
export function orderStage(
  order: Pick<Order, 'status' | 'production_status' | 'delivery_status'>,
): OrderStage {
  if (order.status === 'cancelled') {
    return { index: -1, state: 'cancelled', label: 'Cancelled' };
  }
  if (order.status === 'delivered' || order.delivery_status === 'delivered') {
    return { index: 5, state: 'finished', label: 'Delivered' };
  }
  if (order.status === 'completed') {
    return { index: 4, state: 'moving', label: 'Ready' };
  }
  if (order.status === 'quality_check') {
    return { index: 3, state: 'moving', label: 'In QC' };
  }
  switch (order.production_status) {
    case 'failed':
      return { index: 2, state: 'failed', label: 'Print failed' };
    case 'in_progress':
      return { index: 2, state: 'moving', label: 'Printing' };
    case 'paused':
      return { index: 2, state: 'waiting', label: 'Print paused' };
    case 'completed':
      return { index: 3, state: 'moving', label: 'In QC' };
    case 'queued':
      return { index: 1, state: 'moving', label: 'Queued' };
    default:
      return order.status === 'pending'
        ? { index: 0, state: 'waiting', label: 'Awaiting acceptance' }
        : { index: 0, state: 'moving', label: 'Accepted' };
  }
}

/** The order's stage line, from Accepted to Delivered. */
export function OrderStageLine({
  order,
  labels = false,
  className,
}: {
  order: Pick<Order, 'status' | 'production_status' | 'delivery_status'>;
  labels?: boolean;
  className?: string;
}) {
  return (
    <StageLine
      stages={ORDER_STAGES}
      stage={orderStage(order)}
      labels={labels}
      className={className}
    />
  );
}
