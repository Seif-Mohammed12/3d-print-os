import { useState } from 'react';

import {
  useDailySummary,
  useMaterialUsage,
  usePrinterUtilization,
} from '../../features/analytics/hooks/use-analytics';
import { useCurrency } from '../../features/shop/hooks/use-shop';
import { getErrorMessage } from '../../shared/api/api-error-handler';
import { formatMoney, formatMoneyShort as shortMoney, formatNumber } from '../../shared/lib/format';
import { cn } from '../../shared/lib/utils';
import { BarChart } from '../../shared/ui/bar-chart';
import {
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Skeleton,
  StatCard,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../../shared/ui';

const RANGES = [7, 30, 90] as const;

export function ReportsPage() {
  const currency = useCurrency();
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [showTable, setShowTable] = useState(false);
  const daily = useDailySummary(days);
  const printers = usePrinterUtilization();
  const materials = useMaterialUsage();

  const series = daily.data ?? [];
  const revenue = series.reduce((sum, d) => sum + d.revenue, 0);
  const orders = series.reduce((sum, d) => sum + d.orders, 0);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Revenue, volume and how your printers and materials are doing."
        actions={
          <div
            className="flex rounded-lg border border-input bg-card p-0.5 shadow-card"
            role="group"
            aria-label="Date range"
          >
            {RANGES.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDays(range)}
                aria-pressed={days === range}
                className={cn(
                  'rounded-md px-3 py-1 text-sm font-medium',
                  days === range
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {range} days
              </button>
            ))}
          </div>
        }
      />

      {daily.error && (
        <ErrorNotice message={getErrorMessage(daily.error)} onRetry={() => daily.refetch()} />
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Revenue"
          value={daily.isSuccess ? formatMoney(revenue, currency) : '—'}
          hint={`Last ${days} days`}
        />
        <StatCard
          label="Orders"
          value={daily.isSuccess ? formatNumber(orders) : '—'}
          hint={`Last ${days} days`}
        />
        <StatCard
          label="Average order"
          value={
            daily.isSuccess && orders ? formatMoney(Math.round(revenue / orders), currency) : '—'
          }
          hint="Revenue per order"
        />
      </div>

      <Card className="mb-6">
        <CardHeader
          title="Revenue per day"
          action={
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              className="text-sm font-medium text-primary hover:underline"
            >
              {showTable ? 'Show chart' : 'Show table'}
            </button>
          }
        />
        <CardContent>
          {daily.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : daily.error ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Revenue isn't available right now.
            </p>
          ) : showTable ? (
            <div className="max-h-72 overflow-y-auto">
              <Table>
                <THead>
                  <tr>
                    <TH>Day</TH>
                    <TH className="text-end">Orders</TH>
                    <TH className="text-end">Revenue</TH>
                  </tr>
                </THead>
                <TBody>
                  {[...series].reverse().map((d) => (
                    <TR key={d.day}>
                      <TD>{d.day}</TD>
                      <TD className="tabular text-end">{d.orders}</TD>
                      <TD className="tabular text-end">{formatMoney(d.revenue, currency)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          ) : (
            <BarChart
              ariaLabel={`Revenue per day for the last ${days} days`}
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Printers" description="All-time orders per printer." />
          {printers.isLoading ? (
            <Skeleton className="m-5 h-24" />
          ) : printers.error ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              This report isn't available right now.
            </p>
          ) : (printers.data ?? []).length === 0 ? (
            <EmptyState title="No printer activity yet" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Printer</TH>
                  <TH className="text-end">Orders</TH>
                  <TH className="text-end">Success</TH>
                  <TH className="text-end">Revenue</TH>
                </tr>
              </THead>
              <TBody>
                {(printers.data ?? []).map((p) => (
                  <TR key={p.printer_id}>
                    <TD className="font-medium">{p.printer_name}</TD>
                    <TD className="tabular text-end">{formatNumber(p.total_orders)}</TD>
                    <TD className="tabular text-end">{formatNumber(p.success_rate_percentage)}%</TD>
                    <TD className="tabular text-end">
                      {formatMoney(p.total_revenue_cents, currency)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
        <Card>
          <CardHeader title="Materials" description="All-time revenue per material." />
          {materials.isLoading ? (
            <Skeleton className="m-5 h-24" />
          ) : materials.error ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              This report isn't available right now.
            </p>
          ) : (materials.data ?? []).length === 0 ? (
            <EmptyState title="No material sales yet" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Material</TH>
                  <TH className="text-end">Orders</TH>
                  <TH className="text-end">Revenue</TH>
                </tr>
              </THead>
              <TBody>
                {(materials.data ?? []).map((m) => (
                  <TR key={`${m.material_name}-${m.material_type}`}>
                    <TD>
                      <span className="font-medium">{m.material_name}</span>{' '}
                      <span className="text-muted-foreground">{m.material_type}</span>
                    </TD>
                    <TD className="tabular text-end">{formatNumber(m.order_count)}</TD>
                    <TD className="tabular text-end">
                      {formatMoney(m.total_revenue_cents, currency)}
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
