import { Link } from 'react-router-dom';
import { ListOrdered } from 'lucide-react';

import { ProductionBadge } from '../../features/orders/components/order-badges';
import { useOrders, useUpdateOrder } from '../../features/orders/hooks/use-orders';
import type { Order, ProductionStatus } from '../../features/orders/model/order-types';
import { usePrinters } from '../../features/printers/hooks/use-printers';
import { getErrorMessage } from '../../shared/api/api-error-handler';
import { useToast } from '../../shared/components/feedback/toast-provider';
import { formatRelative } from '../../shared/lib/format';
import { Button, Card, EmptyState, ErrorNotice, PageHeader, Skeleton } from '../../shared/ui';

const COLUMNS: Array<{
  title: string;
  statuses: ProductionStatus[];
  next?: { label: string; status: ProductionStatus };
}> = [
  { title: 'To schedule', statuses: ['not_started'], next: { label: 'Queue', status: 'queued' } },
  { title: 'Queued', statuses: ['queued'], next: { label: 'Start print', status: 'in_progress' } },
  {
    title: 'Printing',
    statuses: ['in_progress', 'paused'],
    next: { label: 'Mark printed', status: 'completed' },
  },
  { title: 'Printed', statuses: ['completed', 'failed'] },
];

const DONE = new Set(['delivered', 'cancelled']);

export function QueuePage() {
  const orders = useOrders({ per_page: 100 });
  const printers = usePrinters();
  const printerName = new Map((printers.data?.data ?? []).map((p) => [p.id, p.name]));
  const active = (orders.data?.data ?? []).filter((order) => !DONE.has(order.status));

  return (
    <>
      <PageHeader
        title="Production queue"
        description="Every open order, from scheduling to the finished print."
      />

      {orders.error && (
        <ErrorNotice
          className="mb-4"
          message={getErrorMessage(orders.error)}
          onRetry={() => orders.refetch()}
        />
      )}

      {orders.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((column) => (
            <Skeleton key={column.title} className="h-64" />
          ))}
        </div>
      ) : orders.error ? null : active.length === 0 ? (
        <Card>
          <EmptyState
            icon={ListOrdered}
            title="Nothing in production"
            description="Orders show up here as soon as a quote is converted."
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((column) => {
            const items = active.filter((order) =>
              column.statuses.includes(order.production_status),
            );
            return (
              <section key={column.title} className="rounded-xl bg-muted/50 p-3">
                <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-semibold text-foreground">
                  {column.title}
                  <span className="tabular rounded-full bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {items.length}
                  </span>
                </h2>
                <div className="space-y-2">
                  {items.map((order) => (
                    <QueueCard
                      key={order.id}
                      order={order}
                      printer={order.printer_id ? printerName.get(order.printer_id) : undefined}
                      next={column.next}
                    />
                  ))}
                  {items.length === 0 && (
                    <p className="px-1 py-4 text-center text-xs text-muted-foreground">Empty</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function QueueCard({
  order,
  printer,
  next,
}: {
  order: Order;
  printer?: string;
  next?: { label: string; status: ProductionStatus };
}) {
  const toast = useToast();
  const update = useUpdateOrder(order.id);

  const advance = async () => {
    if (!next) {
      return;
    }
    try {
      await update.mutateAsync({
        productionStatus: next.status,
        ...(next.status === 'in_progress' ? { status: 'printing' as const } : {}),
        ...(next.status === 'completed' ? { status: 'quality_check' as const } : {}),
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/app/orders/${order.id}`}
          className="font-mono text-xs font-medium text-primary hover:underline"
        >
          {order.order_number}
        </Link>
        {(order.production_status === 'paused' || order.production_status === 'failed') && (
          <ProductionBadge status={order.production_status} />
        )}
      </div>
      <p className="mt-1 truncate text-sm font-medium text-foreground">
        {order.customer_name ?? 'Customer'}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {printer ?? 'No printer yet'} · {formatRelative(order.created_at)}
      </p>
      {next && (
        <Button size="sm" className="mt-3 w-full" onClick={advance} loading={update.isPending}>
          {next.label}
        </Button>
      )}
    </div>
  );
}
