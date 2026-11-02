import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, FileText, Printer as PrinterIcon } from 'lucide-react';

import { useDailySummary } from '../../features/analytics/hooks/use-analytics';
import { useOrders } from '../../features/orders/hooks/use-orders';
import type { Order } from '../../features/orders/model/order-types';
import type { Printer } from '../../features/printers/model/printer-types';
import {
  ORDER_STAGES,
  OrderStageLine,
  orderStage,
} from '../../features/orders/components/order-stage-line';
import { lampFor, useCardAction } from '../../features/production/components/printer-rack';
import { usePrinters } from '../../features/printers/hooks/use-printers';
import { quoteStock, QuoteStatusBadge } from '../../features/quotes/components/quote-parts';
import { useQuotes } from '../../features/quotes/hooks/use-quotes';
import type { QuoteStatus } from '../../features/quotes/model/quote-types';
import { useCurrency } from '../../features/shop/hooks/use-shop';
import { getErrorMessage } from '../../shared/api/api-error-handler';
import {
  formatDuration,
  formatMoney,
  formatMoneyShort as shortMoney,
  formatNumber,
  formatRelative,
  stripExtension,
} from '../../shared/lib/format';
import { BarChart } from '../../shared/ui/bar-chart';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  ErrorNotice,
  Lamp,
  Skeleton,
  StatCard,
  StatStrip,
  StockSwatch,
} from '../../shared/ui';

const OPEN_ORDER = new Set(['accepted', 'production', 'printing', 'quality_check']);

const QUOTE_TABS: Array<{ label: string; value?: QuoteStatus }> = [
  { label: 'Recent' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'pending' },
  { label: 'Approved', value: 'approved' },
];

/** The failed-print notice: names the job and offers the reprint right there. */
function FailureStrip({ order, more }: { order: Order; more: number }) {
  const navigate = useNavigate();
  const { action, run, pending } = useCardAction(order);
  return (
    <div
      role="alert"
      className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-destructive/30 bg-destructive-soft px-4 py-3 text-sm"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-destructive">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="min-w-0 flex-1 text-foreground">
        <span className="font-semibold">{order.order_number}</span> for{' '}
        {order.customer_name ?? 'a customer'} stopped printing.
        {more > 0 && ` ${more} more failed.`}{' '}
        <span className="text-muted-foreground">
          Reprint it, or open the order to move it to another printer.
        </span>
      </p>
      <div className="flex basis-full items-center gap-2 sm:basis-auto">
        {action && (
          <Button
            size="sm"
            variant="primary"
            className="h-11 sm:h-8"
            onClick={run}
            loading={pending}
          >
            {action.label}
          </Button>
        )}
        <Button
          size="sm"
          className="h-11 sm:h-8"
          onClick={() => navigate(`/app/orders/${order.id}`)}
        >
          Open order
        </Button>
      </div>
    </div>
  );
}

/** The last fortnight as tiny bars; today's bar is the solid one. */
function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-10 items-end gap-[3px]" aria-hidden="true">
      {values.map((value, index) => (
        <span
          key={index}
          className={
            index === values.length - 1
              ? 'w-[5px] rounded-full bg-chart'
              : 'w-[5px] rounded-full bg-chart-muted'
          }
          style={{ height: `${Math.max(6, (value / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

/** Failed and running jobs first, then what is waiting behind them. */
const ROW_ORDER = ['failed', 'in_progress', 'paused', 'completed', 'queued', 'not_started'];

/** One printer at a glance: its lamp, what it is printing, and how many jobs wait. */
function FleetCard({ printer, jobs }: { printer: Printer; jobs: Order[] }) {
  const lamp = lampFor(printer, jobs);
  const current =
    jobs.find((job) => job.production_status === 'failed') ??
    jobs.find((job) => job.production_status === 'in_progress');
  const waiting = jobs.filter((job) => job !== current).length;
  return (
    <Link
      to="/app/production/queue"
      className={
        lamp.tone === 'fault'
          ? 'block rounded-xl border border-stock-failed/40 bg-card p-4 shadow-card transition-colors duration-150 hover:border-stock-failed/70 dark:shadow-none'
          : 'block rounded-xl border border-border bg-card p-4 shadow-card transition-colors duration-150 hover:border-foreground/20 dark:shadow-none'
      }
    >
      <p className="truncate text-sm font-semibold text-foreground">{printer.name}</p>
      <Lamp tone={lamp.tone} className="mt-1">
        {lamp.label}
      </Lamp>
      <p className="mt-3 truncate text-[13px] text-muted-foreground">
        {current ? (
          <>
            <span className="font-mono text-xs">{current.order_number}</span> ·{' '}
            {current.customer_name ?? 'Customer'}
          </>
        ) : (
          'Nothing on the bed'
        )}
      </p>
      <p className="tabular mt-0.5 text-xs text-muted-foreground">
        {waiting === 0 ? 'No jobs waiting' : `${waiting} waiting`}
      </p>
    </Link>
  );
}

/** An order in progress: who, where, how far along, and the one thing to do next. */
function OrderRow({ order, printerName }: { order: Order; printerName?: string }) {
  const navigate = useNavigate();
  const { action, run, pending } = useCardAction(order);
  const stage = orderStage(order);
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:px-5 md:grid-cols-[minmax(0,1.2fr)_minmax(13rem,1.4fr)_6.5rem]">
      <button
        type="button"
        onClick={() => navigate(`/app/orders/${order.id}`)}
        className="min-w-0 rounded-lg text-start"
      >
        <span className="block truncate text-sm font-semibold text-foreground">
          {order.customer_name ?? 'Customer'}
        </span>
        <span className="tabular block truncate text-xs text-muted-foreground">
          <span className="font-mono">{order.order_number}</span> ·{' '}
          {printerName ?? 'No printer yet'} · {formatMoney(order.total_cents, order.currency)}
        </span>
      </button>
      <div className="order-3 col-span-2 min-w-0 md:order-none md:col-span-1">
        <OrderStageLine order={order} />
        <p
          className={
            stage.state === 'failed'
              ? 'mt-1.5 text-xs font-semibold text-destructive md:hidden'
              : 'mt-1.5 text-xs text-muted-foreground md:hidden'
          }
        >
          {stage.label}
        </p>
      </div>
      <div className="flex justify-end">
        {action && (
          <Button
            size="sm"
            variant={order.production_status === 'failed' ? 'primary' : 'secondary'}
            className="h-11 w-full sm:h-8"
            onClick={run}
            loading={pending}
          >
            {action.label}
          </Button>
        )}
      </div>
    </li>
  );
}

export function DashboardPage() {
  const currency = useCurrency();
  const [quoteTab, setQuoteTab] = useState<QuoteStatus | undefined>(undefined);
  const daily = useDailySummary(14);
  const quotes = useQuotes({ perPage: 8, status: quoteTab });
  const drafts = useQuotes({ status: 'draft', perPage: 1 });
  const orders = useOrders({ per_page: 100 });
  const printers = usePrinters();

  const series = daily.data ?? [];
  const revenue = series.reduce((sum, d) => sum + d.revenue, 0);
  const openOrders = (orders.data?.data ?? []).filter((o) => OPEN_ORDER.has(o.status));
  const printing = openOrders.filter((o) => o.production_status === 'in_progress').length;
  const failedPrints = openOrders.filter((o) => o.production_status === 'failed');
  const fleet = printers.data?.data ?? [];
  const activePrinters = fleet.filter((p) => p.status === 'active').length;
  // Never show a zero we didn't actually load.
  const show = (ready: boolean, value: string) => (ready ? value : '—');
  const failed = [daily, quotes, drafts, orders, printers].filter((q) => q.error);
  const retryAll = () => failed.forEach((q) => q.refetch());
  const firstFailure = failedPrints[0];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-foreground">
            Today on the floor
          </h1>
          {orders.isSuccess && drafts.isSuccess && (
            <p className="mt-1 text-sm text-muted-foreground">
              {printing} {printing === 1 ? 'print' : 'prints'} running ·{' '}
              {formatNumber(drafts.data?.meta?.total ?? 0)} draft{' '}
              {drafts.data?.meta?.total === 1 ? 'quote' : 'quotes'} waiting
              {failedPrints.length > 0 && (
                <span className="font-semibold text-destructive">
                  {' '}
                  · {failedPrints.length} failed {failedPrints.length === 1 ? 'print' : 'prints'}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {failed.length > 0 && (
        <ErrorNotice
          className="mb-4"
          message={`Some of your numbers couldn't be loaded: ${getErrorMessage(failed[0]?.error)}`}
          onRetry={retryAll}
        />
      )}

      <StatStrip className="mb-6">
        <StatCard
          label="Revenue, 14 days"
          value={show(daily.isSuccess, formatMoney(revenue, currency))}
          hint={
            daily.isSuccess
              ? `${formatNumber(series.reduce((s, d) => s + d.orders, 0))} orders`
              : undefined
          }
          aside={series.length > 1 ? <MiniBars values={series.map((d) => d.revenue)} /> : undefined}
        />
        <StatCard
          label="Open orders"
          value={show(orders.isSuccess, formatNumber(openOrders.length))}
          hint={orders.isSuccess ? `${printing} printing now` : undefined}
        />
        <StatCard
          label="Draft quotes"
          value={show(drafts.isSuccess, formatNumber(drafts.data?.meta?.total ?? 0))}
          hint="Waiting to be sent"
        />
        <StatCard
          label="Printers ready"
          value={show(printers.isSuccess, `${activePrinters} / ${fleet.length}`)}
          hint={
            printers.isSuccess
              ? fleet.length
                ? 'Active in your fleet'
                : 'Add your first printer'
              : undefined
          }
          hintTone={printers.isSuccess && !fleet.length ? 'warning' : 'muted'}
        />
      </StatStrip>

      {firstFailure && <FailureStrip order={firstFailure} more={failedPrints.length - 1} />}

      <section aria-labelledby="fleet-title" className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="fleet-title" className="text-base font-semibold text-foreground">
            Fleet
          </h2>
          <Link to="/app/production/queue" className="link text-[13px]">
            Open queue
          </Link>
        </div>
        {printers.isLoading || orders.isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-[7.5rem] rounded-xl" />
            ))}
          </div>
        ) : printers.error || orders.error ? (
          <p className="rounded-xl border border-dashed border-input py-10 text-center text-sm text-muted-foreground">
            Printer status isn't available right now.
          </p>
        ) : fleet.length === 0 ? (
          <Card>
            <EmptyState
              icon={PrinterIcon}
              title="No printers yet"
              description="Add a printer to see what it's printing and what waits for it."
              action={
                <Link to="/app/printers">
                  <Button variant="primary">Add a printer</Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {fleet
              .filter((printer) => printer.status !== 'retired')
              .map((printer) => (
                <FleetCard
                  key={printer.id}
                  printer={printer}
                  jobs={openOrders.filter((order) => order.printer_id === printer.id)}
                />
              ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-labelledby="orders-title" className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="orders-title" className="text-base font-semibold text-foreground">
              Orders in progress
            </h2>
            <Link to="/app/orders" className="link text-[13px]">
              All orders
            </Link>
          </div>
          <Card className="overflow-hidden">
            {orders.isLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : orders.error ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Orders aren't available right now.
              </p>
            ) : openOrders.length === 0 ? (
              <EmptyState
                icon={ArrowRight}
                title="Nothing in progress"
                description="Approved quotes become orders here, and you follow each one to delivery."
              />
            ) : (
              <>
                {/* Stage names once, above the dot columns, so the rows stay calm. */}
                <div
                  aria-hidden="true"
                  className="hidden border-b border-border bg-muted/40 px-5 py-2.5 md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(13rem,1.4fr)_6.5rem] md:gap-x-4"
                >
                  <span className="text-xs font-medium text-muted-foreground">Order</span>
                  <span className="grid grid-cols-6">
                    {ORDER_STAGES.map((name) => (
                      <span
                        key={name}
                        className="truncate text-center text-[11px] font-medium text-muted-foreground"
                      >
                        {name}
                      </span>
                    ))}
                  </span>
                  <span />
                </div>
                <ul className="divide-y divide-border">
                  {[...openOrders]
                    .sort(
                      (a, b) =>
                        ROW_ORDER.indexOf(a.production_status) -
                        ROW_ORDER.indexOf(b.production_status),
                    )
                    .slice(0, 8)
                    .map((order) => (
                      <OrderRow
                        key={`${order.id}-${order.status}-${order.production_status}`}
                        order={order}
                        printerName={fleet.find((p) => p.id === order.printer_id)?.name}
                      />
                    ))}
                </ul>
              </>
            )}
          </Card>
        </section>

        <section aria-labelledby="quotes-title" className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="quotes-title" className="text-base font-semibold text-foreground">
              Recent quotes
            </h2>
            <Link to="/app/quotes" className="link text-[13px]">
              All quotes
            </Link>
          </div>
          <Card className="overflow-hidden">
            <div className="flex gap-1 overflow-x-auto border-b border-border p-2" role="tablist">
              {QUOTE_TABS.map((tab) => (
                <button
                  key={tab.label}
                  type="button"
                  role="tab"
                  aria-selected={quoteTab === tab.value}
                  onClick={() => setQuoteTab(tab.value)}
                  className={
                    quoteTab === tab.value
                      ? 'min-h-11 rounded-lg bg-muted px-3 text-[13px] font-semibold text-foreground sm:min-h-8'
                      : 'min-h-11 rounded-lg px-3 text-[13px] font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground sm:min-h-8'
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {quotes.isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : quotes.error ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Quotes aren't available right now.
              </p>
            ) : (quotes.data?.data ?? []).length === 0 ? (
              <EmptyState
                icon={FileText}
                title={quoteTab ? 'No quotes with this status' : 'No quotes yet'}
                description="Upload a model to price your first job."
                action={
                  <Link to="/app/quotes/new">
                    <Button variant="primary">New quote</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {(quotes.data?.data ?? []).map((quote) => (
                  <li key={quote.id}>
                    <Link
                      to={`/app/quotes/${quote.id}`}
                      className="flex items-start gap-3 px-4 py-3 transition-colors duration-150 hover:bg-muted/60"
                    >
                      <StockSwatch stock={quoteStock(quote)} className="mt-1.5" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-foreground">
                          {quote.model_filename
                            ? stripExtension(quote.model_filename)
                            : quote.quote_number}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {quote.customer_name ?? 'No customer'} ·{' '}
                          {formatRelative(quote.created_at)}
                        </span>
                        {quote.estimate_source === 'slicer' && quote.estimated_time_minutes > 0 && (
                          <span className="tabular block text-xs text-muted-foreground">
                            {formatDuration(quote.estimated_time_minutes)} from the slice
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-end">
                        <span className="tabular block text-[13px] font-semibold text-foreground">
                          {quote.estimate_source
                            ? formatMoney(quote.total_cents, quote.currency)
                            : '—'}
                        </span>
                        <span className="mt-1 block">
                          <QuoteStatusBadge quote={quote} />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>

      <Card className="mt-6">
        <CardHeader title="Revenue per day" description="Last 14 days. Today is the solid bar." />
        <CardContent>
          {daily.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : daily.error ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Revenue isn't available right now.
            </p>
          ) : (
            <BarChart
              ariaLabel="Revenue per day for the last 14 days"
              formatTick={(v) => shortMoney(v, currency)}
              data={series.map((d) => ({
                key: d.day,
                label: new Date(d.day).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                }),
                value: d.revenue,
                display: `${formatMoney(d.revenue, currency)} · ${d.orders} orders`,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
