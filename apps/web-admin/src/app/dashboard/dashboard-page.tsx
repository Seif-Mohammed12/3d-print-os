import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Printer as PrinterIcon } from 'lucide-react';

import { useDailySummary } from '../../features/analytics/hooks/use-analytics';
import { useOrders } from '../../features/orders/hooks/use-orders';
import type { Order } from '../../features/orders/model/order-types';
import { PrinterRack, useCardAction } from '../../features/production/components/printer-rack';
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

/** The failed-print strip: names the job and offers the reprint right there. */
function FailureStrip({ order, more }: { order: Order; more: number }) {
  const navigate = useNavigate();
  const { action, run, pending } = useCardAction(order);
  return (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-stretch overflow-hidden rounded-sm border border-destructive bg-destructive-soft text-sm"
    >
      <span className="flex items-center bg-stock-failed px-2.5 text-[11px] font-bold tracking-[0.02em] text-white">
        FAILED
      </span>
      <p className="min-w-0 flex-1 px-3 py-2.5 text-foreground">
        <span className="font-semibold">{order.order_number}</span> for{' '}
        {order.customer_name ?? 'a customer'} stopped printing.
        {more > 0 && ` ${more} more failed.`} Reprint it, or open the order to move it to another
        printer.
      </p>
      <div className="flex basis-full items-center gap-2 border-t border-destructive/40 px-2 py-2 sm:basis-auto sm:border-0 sm:py-1.5">
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

/** The last fortnight as tiny bars; today's bar is the yellow card. */
function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-9 items-end gap-[2px]" aria-hidden="true">
      {values.map((value, index) => (
        <span
          key={index}
          className={
            index === values.length - 1
              ? 'w-[5px] bg-stock-quoted ring-1 ring-inset ring-stock-edge'
              : 'w-[5px] bg-chart'
          }
          style={{ height: `${Math.max(6, (value / max) * 100)}%` }}
        />
      ))}
    </div>
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
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight tracking-[-0.01em] text-foreground">
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

      <StatStrip className="mb-4">
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

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="rack-title" className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="rack-title" className="text-[15px] font-bold text-foreground">
              Printer rack
            </h2>
            <Link to="/app/production/queue" className="link text-[13px]">
              Open queue
            </Link>
          </div>
          {orders.isLoading || printers.isLoading ? (
            <Skeleton className="h-[22rem] w-full" />
          ) : orders.error || printers.error ? (
            <p className="rounded-sm border border-dashed border-input py-16 text-center text-sm text-muted-foreground">
              The rack isn't available right now.
            </p>
          ) : fleet.length === 0 ? (
            <Card>
              <EmptyState
                icon={PrinterIcon}
                title="No printers in the rack"
                description="Add a printer and its open jobs will hang in its own column here."
                action={
                  <Link to="/app/printers">
                    <Button variant="primary">Add a printer</Button>
                  </Link>
                }
              />
            </Card>
          ) : (
            <PrinterRack printers={fleet} orders={openOrders} />
          )}
        </section>

        <section aria-labelledby="quotes-title" className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="quotes-title" className="text-[15px] font-bold text-foreground">
              Recent quotes
            </h2>
            <Link to="/app/quotes" className="link text-[13px]">
              All quotes
            </Link>
          </div>
          <Card>
            <div className="flex overflow-x-auto border-b border-border px-1" role="tablist">
              {QUOTE_TABS.map((tab) => (
                <button
                  key={tab.label}
                  type="button"
                  role="tab"
                  aria-selected={quoteTab === tab.value}
                  onClick={() => setQuoteTab(tab.value)}
                  className={
                    quoteTab === tab.value
                      ? '-mb-px min-h-11 border-b-2 border-rule px-3 text-[13px] font-semibold text-foreground sm:min-h-9'
                      : '-mb-px min-h-11 border-b-2 border-transparent px-3 text-[13px] font-medium text-muted-foreground hover:text-foreground sm:min-h-9'
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
                      className="flex items-start gap-3 px-3 py-2.5 transition-colors duration-150 hover:bg-muted/70"
                    >
                      <StockSwatch stock={quoteStock(quote)} className="mt-1" />
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
                            Slice: {formatDuration(quote.estimated_time_minutes)}
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

      <Card className="mt-5">
        <CardHeader title="Revenue per day" description="Last 14 days. Today is the yellow bar." />
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
