import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Search } from 'lucide-react';

import {
  OrderStatusBadge,
  PaymentBadge,
  ProductionBadge,
} from '../../features/orders/components/order-badges';
import { useOrders } from '../../features/orders/hooks/use-orders';
import type { OrderStatus } from '../../features/orders/model/order-types';
import { getErrorMessage } from '../../shared/api/api-error-handler';
import { formatMoney, formatRelative } from '../../shared/lib/format';
import { cn } from '../../shared/lib/utils';
import {
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  Input,
  PageHeader,
  Skeleton,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../../shared/ui';

const FILTERS: Array<{ label: string; value?: OrderStatus }> = [
  { label: 'All' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'In production', value: 'production' },
  { label: 'Printing', value: 'printing' },
  { label: 'Completed', value: 'completed' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

const PAGE_SIZE = 20;

export function OrdersPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<OrderStatus | undefined>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const orders = useOrders({
    status,
    search: search.trim() || undefined,
    page,
    per_page: PAGE_SIZE,
  });
  const rows = orders.data?.data ?? [];
  const total = orders.data?.meta?.total ?? rows.length;

  return (
    <>
      <PageHeader
        title="Orders"
        description="Approved quotes become orders. Track them through production and delivery."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto">
          {FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => {
                setStatus(filter.value);
                setPage(1);
              }}
              className={cn(
                'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                status === filter.value
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search order number"
            className="ps-9"
            aria-label="Search orders"
          />
        </div>
      </div>

      {orders.error && (
        <ErrorNotice
          className="mb-4"
          message={getErrorMessage(orders.error)}
          onRetry={() => orders.refetch()}
        />
      )}

      <Card className={orders.error ? 'hidden' : undefined}>
        {orders.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : orders.error ? null : rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No orders yet"
            description="Approve a quote and choose “Create order” to start production."
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Order</TH>
                <TH>Customer</TH>
                <TH className="text-end">Total</TH>
                <TH className="hidden sm:table-cell">Payment</TH>
                <TH className="hidden md:table-cell">Production</TH>
                <TH>Status</TH>
                <TH className="hidden lg:table-cell">Created</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((order) => (
                <TR key={order.id} onClick={() => navigate(`/app/orders/${order.id}`)}>
                  <TD className="font-mono text-xs text-muted-foreground">{order.order_number}</TD>
                  <TD className="font-medium">{order.customer_name ?? '—'}</TD>
                  <TD className="tabular text-end font-medium">
                    {formatMoney(order.total_cents, order.currency)}
                  </TD>
                  <TD className="hidden sm:table-cell">
                    <PaymentBadge status={order.payment_status} />
                  </TD>
                  <TD className="hidden md:table-cell">
                    <ProductionBadge status={order.production_status} />
                  </TD>
                  <TD>
                    <OrderStatusBadge status={order.status} />
                  </TD>
                  <TD className="hidden text-muted-foreground lg:table-cell">
                    {formatRelative(order.created_at)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-2">
            <Button size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              size="sm"
              disabled={page * PAGE_SIZE >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
