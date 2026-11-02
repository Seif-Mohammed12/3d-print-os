import { Link } from 'react-router-dom';

import { getErrorMessage } from '../../../shared/api/api-error-handler';
import { useToast } from '../../../shared/components/feedback/toast-provider';
import { formatMoney, formatRelative } from '../../../shared/lib/format';
import { cn } from '../../../shared/lib/utils';
import { Button, Lamp, type LampTone, TCard } from '../../../shared/ui';
import { productionStock } from '../../orders/components/order-badges';
import { useUpdateOrder } from '../../orders/hooks/use-orders';
import {
  PRODUCTION_STATUS_LABEL,
  type Order,
  type UpdateOrderInput,
} from '../../orders/model/order-types';
import type { Printer, PrinterStatus } from '../../printers/model/printer-types';

/** Running and failed jobs hang first; the next one waits behind them. */
const RACK_ORDER = ['failed', 'in_progress', 'paused', 'completed', 'queued', 'not_started'];

/** The one thing a person does next with a card, straight from the rack. */
export function nextAction(order: Order): { label: string; input: UpdateOrderInput } | null {
  switch (order.production_status) {
    case 'not_started':
      return { label: 'Queue', input: { productionStatus: 'queued' } };
    case 'queued':
      return {
        label: 'Start print',
        input: { productionStatus: 'in_progress', status: 'printing' },
      };
    case 'in_progress':
      return {
        label: 'Mark printed',
        input: { productionStatus: 'completed', status: 'quality_check' },
      };
    case 'completed':
      return order.status === 'quality_check'
        ? { label: 'Pass QC', input: { status: 'completed' } }
        : null;
    case 'failed':
      return { label: 'Reprint', input: { productionStatus: 'queued', status: 'production' } };
    default:
      return null;
  }
}

/** Runs a card's next action and reports failures as a toast. */
export function useCardAction(order: Order) {
  const toast = useToast();
  const update = useUpdateOrder(order.id);
  const action = nextAction(order);
  const run = async () => {
    if (!action) {
      return;
    }
    try {
      await update.mutateAsync(action.input);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };
  return { action, run, pending: update.isPending };
}

export function lampFor(printer: Printer, jobs: Order[]): { tone: LampTone; label: string } {
  if (jobs.some((job) => job.production_status === 'failed')) {
    return { tone: 'fault', label: 'Failed print' };
  }
  if (jobs.some((job) => job.production_status === 'in_progress')) {
    return { tone: 'running', label: 'Printing' };
  }
  const idle: Record<PrinterStatus, { tone: LampTone; label: string }> = {
    active: { tone: 'ready', label: 'Ready' },
    maintenance: { tone: 'waiting', label: 'Maintenance' },
    offline: { tone: 'off', label: 'Offline' },
    retired: { tone: 'off', label: 'Retired' },
  };
  return idle[printer.status];
}

function RackCard({ order }: { order: Order }) {
  const { action, run, pending } = useCardAction(order);
  return (
    // Keyed by status so a card that changes state drops into its new slot.
    <div key={order.production_status} className="slot-in">
      <TCard
        stock={productionStock(order.production_status)}
        head={PRODUCTION_STATUS_LABEL[order.production_status].toUpperCase()}
        aside={
          <Link to={`/app/orders/${order.id}`} className="hover:text-foreground hover:underline">
            {order.order_number}
          </Link>
        }
        emphasis={order.production_status === 'failed'}
      >
        <p className="truncate text-sm font-semibold">{order.customer_name ?? 'Customer'}</p>
        <p className="mt-0.5 flex justify-between gap-2 text-xs text-muted-foreground">
          <span className="tabular shrink-0 whitespace-nowrap">
            {formatMoney(order.total_cents, order.currency)}
          </span>
          <span className="min-w-0 truncate">
            {formatRelative(order.started_at ?? order.created_at)}
          </span>
        </p>
        {action && (
          <Button
            size="sm"
            variant={order.production_status === 'failed' ? 'primary' : 'secondary'}
            className="mt-3 h-11 w-full sm:h-8"
            onClick={run}
            loading={pending}
          >
            {action.label}
          </Button>
        )}
      </TCard>
    </div>
  );
}

function RackColumn({
  title,
  lamp,
  jobs,
  emptyText,
}: {
  title: string;
  lamp?: { tone: LampTone; label: string };
  jobs: Order[];
  emptyText: string;
}) {
  return (
    <section className="flex min-w-0 flex-col sm:min-w-[9.5rem] sm:flex-1" aria-label={title}>
      <header className="px-1 pb-2">
        <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          {lamp ? <Lamp tone={lamp.tone}>{lamp.label}</Lamp> : <span />}
          <span className="tabular text-xs text-muted-foreground">
            {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
          </span>
        </div>
      </header>
      <div className="flex-1 rounded-2xl bg-muted/50 p-2.5">
        <div className="space-y-3">
          {jobs.map((job) => (
            <RackCard key={job.id} order={job} />
          ))}
          {jobs.length === 0 && (
            <p className="rounded-xl border border-dashed border-input px-3 py-4 text-center text-xs text-muted-foreground">
              {emptyText}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * The printer board: one slot column per printer with its open jobs hanging in it, plus a
 * column for open orders that have no printer yet (first when it holds any, since those need
 * a hand).
 */
export function PrinterRack({
  printers,
  orders,
  className,
}: {
  printers: Printer[];
  orders: Order[];
  className?: string;
}) {
  const byPrinter = new Map<string, Order[]>();
  const unassigned: Order[] = [];
  const sorted = [...orders].sort(
    (a, b) => RACK_ORDER.indexOf(a.production_status) - RACK_ORDER.indexOf(b.production_status),
  );
  const known = new Set(printers.map((p) => p.id));
  for (const order of sorted) {
    if (order.printer_id && known.has(order.printer_id)) {
      byPrinter.set(order.printer_id, [...(byPrinter.get(order.printer_id) ?? []), order]);
    } else {
      unassigned.push(order);
    }
  }
  const fleet = printers.filter((p) => p.status !== 'retired');
  const unassignedColumn = (
    <RackColumn
      key="unassigned"
      title="No printer yet"
      jobs={unassigned}
      emptyText="Every open order has a printer."
    />
  );

  return (
    <div className={cn('flex flex-col gap-5 sm:flex-row sm:gap-4 sm:overflow-x-auto', className)}>
      {unassigned.length > 0 && unassignedColumn}
      {fleet.map((printer) => {
        const jobs = byPrinter.get(printer.id) ?? [];
        return (
          <RackColumn
            key={printer.id}
            title={printer.name}
            lamp={lampFor(printer, jobs)}
            jobs={jobs}
            emptyText="Assign a queued order to this printer."
          />
        );
      })}
      {unassigned.length === 0 && unassignedColumn}
    </div>
  );
}
