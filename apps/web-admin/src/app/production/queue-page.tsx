import { Link } from 'react-router-dom';
import { ListOrdered } from 'lucide-react';

import { productionStock } from '../../features/orders/components/order-badges';
import { useOrders, useUpdateOrder } from '../../features/orders/hooks/use-orders';
import {
  PRODUCTION_STATUS_LABEL,
  type Order,
  type ProductionStatus,
} from '../../features/orders/model/order-types';
import { usePrinters } from '../../features/printers/hooks/use-printers';
import { getErrorMessage } from '../../shared/api/api-error-handler';
import { useToast } from '../../shared/components/feedback/toast-provider';
import { formatMoney, formatRelative } from '../../shared/lib/format';
import {
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Skeleton,
  TCard,
} from '../../shared/ui';

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
        <Skeleton className="h-[28rem] w-full" />
      ) : orders.error ? null : active.length === 0 ? (
        <Card>
          <EmptyState
            icon={ListOrdered}
            title="Nothing in production"
            description="Orders show up here as soon as a quote is converted."
          />
        </Card>
      ) : (
        <div className="grid gap-x-3 gap-y-6 rounded-sm border border-slot bg-rack p-3 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((column) => {
            const items = active.filter((order) =>
              column.statuses.includes(order.production_status),
            );
            return (
              <section key={column.title} className="flex min-w-0 flex-col">
                <h2 className="flex items-baseline justify-between border-b-2 border-rule px-0.5 pb-1.5 text-[13px] font-bold text-foreground">
                  {column.title}
                  <span className="tabular text-xs font-medium text-muted-foreground">
                    {items.length} {items.length === 1 ? 'job' : 'jobs'}
                  </span>
                </h2>
                <div className="flex-1 space-y-4 bg-[repeating-linear-gradient(to_bottom,hsl(var(--slot))_0_2px,transparent_2px_142px)] bg-[position:0_10px] pt-3">
                  {items.map((order) => (
                    <QueueCard
                      key={order.id}
                      order={order}
                      printer={order.printer_id ? printerName.get(order.printer_id) : undefined}
                      next={column.next}
                    />
                  ))}
                  {items.length === 0 && (
                    <p className="flex h-20 items-center justify-center rounded-sm border border-dashed border-input text-xs text-muted-foreground">
                      No jobs here
                    </p>
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
    <TCard
      stock={productionStock(order.production_status)}
      head={PRODUCTION_STATUS_LABEL[order.production_status].toUpperCase()}
      aside={
        <Link to={`/app/orders/${order.id}`} className="underline underline-offset-2">
          {order.order_number}
        </Link>
      }
      emphasis={order.production_status === 'failed'}
    >
      <p className="truncate text-[13px] font-semibold">{order.customer_name ?? 'Customer'}</p>
      <p className="mt-0.5 flex justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{printer ?? 'No printer yet'}</span>
        <span className="tabular shrink-0">{formatMoney(order.total_cents, order.currency)}</span>
      </p>
      <p className="text-xs text-muted-foreground">{formatRelative(order.created_at)}</p>
      {next && (
        <Button size="sm" className="mt-2 w-full" onClick={advance} loading={update.isPending}>
          {next.label}
        </Button>
      )}
    </TCard>
  );
}
