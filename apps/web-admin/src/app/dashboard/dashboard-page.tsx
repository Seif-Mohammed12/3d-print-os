import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, FileText } from 'lucide-react';

import { useDailySummary } from '../../features/analytics/hooks/use-analytics';
import { useOrders } from '../../features/orders/hooks/use-orders';
import { usePrinters } from '../../features/printers/hooks/use-printers';
import { QuoteStatusBadge } from '../../features/quotes/components/quote-parts';
import { useQuotes } from '../../features/quotes/hooks/use-quotes';
import { useCurrency } from '../../features/shop/hooks/use-shop';
import { getErrorMessage } from '../../shared/api/api-error-handler';
import {
  formatMoney,
  formatMoneyShort as shortMoney,
  formatNumber,
  formatRelative,
  stripExtension,
} from '../../shared/lib/format';
import { useAuthStore } from '../../shared/stores/auth-store';
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
  Table,
  TBody,
  TD,
  TR,
} from '../../shared/ui';

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

const OPEN_ORDER = new Set(['accepted', 'production', 'printing', 'quality_check']);

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const currency = useCurrency();
  const daily = useDailySummary(14);
  const quotes = useQuotes({ perPage: 6 });
  const drafts = useQuotes({ status: 'draft', perPage: 1 });
  const orders = useOrders({ per_page: 100 });
  const printers = usePrinters();

  const series = daily.data ?? [];
  const revenue = series.reduce((sum, d) => sum + d.revenue, 0);
  const openOrders = (orders.data?.data ?? []).filter((o) => OPEN_ORDER.has(o.status));
  const printing = openOrders.filter((o) => o.production_status === 'in_progress').length;
  const fleet = printers.data?.data ?? [];
  const activePrinters = fleet.filter((p) => p.status === 'active').length;
  const firstName = user?.full_name?.split(' ')[0];
  // Never show a zero we didn't actually load.
  const show = (ready: boolean, value: string) => (ready ? value : '—');
  const failed = [daily, quotes, drafts, orders, printers].filter((q) => q.error);
  const retryAll = () => failed.forEach((q) => q.refetch());

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {greeting()}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        {orders.isSuccess && drafts.isSuccess && (
          <p className="mt-1 text-sm text-muted-foreground">
            {printing} {printing === 1 ? 'print' : 'prints'} running ·{' '}
            {formatNumber(drafts.data?.meta?.total ?? 0)} draft quotes waiting
          </p>
        )}
      </div>

      {failed.length > 0 && (
        <div className="mb-6">
          <ErrorNotice
            message={`Some of your numbers couldn't be loaded: ${getErrorMessage(failed[0]?.error)}`}
            onRetry={retryAll}
          />
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={show(daily.isSuccess, formatMoney(revenue, currency))}
          hint="Last 14 days"
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
          label="Printers active"
          value={show(printers.isSuccess, `${activePrinters} / ${fleet.length}`)}
          hint={
            printers.isSuccess
              ? fleet.length
                ? 'In your fleet'
                : 'Add your first printer'
              : undefined
          }
          hintTone={printers.isSuccess && !fleet.length ? 'warning' : 'muted'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Revenue per day" description="Last 14 days" />
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

        <Card>
          <CardHeader
            title="Recent quotes"
            action={
              <Link
                to="/app/quotes"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {quotes.isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : quotes.error ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Quotes aren't available right now.
            </p>
          ) : (quotes.data?.data ?? []).length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No quotes yet"
              description="Upload a model to price your first job."
              action={
                <Link to="/app/quotes/new">
                  <Button variant="primary">New quote</Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <TBody>
                {(quotes.data?.data ?? []).map((quote) => (
                  <TR key={quote.id} onClick={() => navigate(`/app/quotes/${quote.id}`)}>
                    <TD>
                      <p className="max-w-[12rem] truncate font-medium text-foreground">
                        {quote.model_filename
                          ? stripExtension(quote.model_filename)
                          : quote.quote_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {quote.customer_name ?? '—'} · {formatRelative(quote.created_at)}
                      </p>
                    </TD>
                    <TD className="tabular text-end font-medium">
                      {quote.estimate_source ? formatMoney(quote.total_cents, quote.currency) : '—'}
                    </TD>
                    <TD className="text-end">
                      <QuoteStatusBadge quote={quote} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
