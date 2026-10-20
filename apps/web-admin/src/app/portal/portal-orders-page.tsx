import { Package } from 'lucide-react';

import type { PortalOrder } from '../../features/portal/api/portal-api';
import { usePortalOrders } from '../../features/portal/hooks/use-portal';
import { getErrorMessage } from '../../shared/api/api-error-handler';
import { formatDate, formatMoney } from '../../shared/lib/format';
import { cn } from '../../shared/lib/utils';
import { Badge, type BadgeTone, Card, EmptyState, ErrorNotice, Skeleton } from '../../shared/ui';

const STATUS: Record<PortalOrder['status'], { label: string; tone: BadgeTone }> = {
  received: { label: 'Received', tone: 'neutral' },
  printing: { label: 'Printing', tone: 'accent' },
  ready: { label: 'Ready', tone: 'success' },
  shipped: { label: 'Shipped', tone: 'accent' },
  delivered: { label: 'Delivered', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

const STAGES: Array<PortalOrder['status']> = ['received', 'printing', 'ready', 'delivered'];

/** Shipped sits between ready and delivered on the progress bar. */
const stageIndex = (status: PortalOrder['status']) =>
  status === 'shipped' ? STAGES.indexOf('ready') : STAGES.indexOf(status);

export function PortalOrdersPage() {
  const orders = usePortalOrders();
  const rows = orders.data ?? [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Your orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Follow your parts from the printer to your door.
        </p>
      </div>

      {orders.error && (
        <ErrorNotice
          className="mb-4"
          message={getErrorMessage(orders.error)}
          onRetry={() => orders.refetch()}
        />
      )}

      {orders.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : orders.error ? null : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="Orders you place from a quote show up here while we print them."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((order) => {
            const status = STATUS[order.status];
            const stage = stageIndex(order.status);
            return (
              <Card key={order.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-foreground">
                        {order.model_filename ?? `Order ${order.order_number}`}
                      </p>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-mono">{order.order_number}</span>
                      {order.quantity
                        ? ` · ${order.quantity} ${order.quantity === 1 ? 'part' : 'parts'}`
                        : ''}
                      {` · ordered ${formatDate(order.created_at)}`}
                    </p>
                    {order.tracking_number && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Tracking{' '}
                        <span className="font-mono text-foreground">{order.tracking_number}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-end">
                    <p className="tabular text-lg font-semibold text-foreground">
                      {formatMoney(order.total_cents, order.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.delivered_at
                        ? `Delivered ${formatDate(order.delivered_at)}`
                        : order.completed_at
                          ? `Finished ${formatDate(order.completed_at)}`
                          : ''}
                    </p>
                  </div>
                </div>
                {order.status !== 'cancelled' && (
                  <ol className="mt-4 grid grid-cols-4 gap-2" aria-label="Progress">
                    {STAGES.map((s, index) => (
                      <li key={s}>
                        <div
                          className={cn(
                            'h-1.5 rounded-full',
                            index <= stage ? 'bg-primary' : 'bg-muted',
                          )}
                        />
                        <p
                          className={cn(
                            'mt-1.5 text-xs',
                            index <= stage ? 'text-foreground' : 'text-muted-foreground',
                          )}
                        >
                          {STATUS[s].label}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
