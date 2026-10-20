import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

import type { PortalQuote } from '../../features/portal/api/portal-api';
import { useAcceptQuote, usePortalQuotes } from '../../features/portal/hooks/use-portal';
import { getErrorMessage } from '../../shared/api/api-error-handler';
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatGrams,
  formatMoney,
} from '../../shared/lib/format';
import {
  Badge,
  type BadgeTone,
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  Skeleton,
} from '../../shared/ui';

const STATUS: Record<PortalQuote['status'], { label: string; tone: BadgeTone }> = {
  unpriced: { label: 'No price', tone: 'neutral' },
  priced: { label: 'Price ready', tone: 'accent' },
  expired: { label: 'Expired', tone: 'warning' },
  ordered: { label: 'Ordered', tone: 'success' },
  declined: { label: 'Declined', tone: 'danger' },
};

const QUALITY: Record<NonNullable<PortalQuote['quality']>, string> = {
  draft: 'Draft',
  standard: 'Standard',
  fine: 'Fine',
};

function summary(quote: PortalQuote): string {
  const parts = [
    quote.material ? [quote.material.name, quote.material.color].filter(Boolean).join(' · ') : null,
    quote.quality ? `${QUALITY[quote.quality]} quality` : null,
    `${quote.quantity} ${quote.quantity === 1 ? 'part' : 'parts'}`,
  ];
  return parts.filter(Boolean).join(' · ');
}

export function PortalQuotesPage() {
  const quotes = usePortalQuotes();
  const accept = useAcceptQuote();
  const rows = quotes.data ?? [];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Your quotes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prices for the parts you've uploaded.
          </p>
        </div>
        <Link to="/portal/upload">
          <Button variant="primary">Get a quote</Button>
        </Link>
      </div>

      {quotes.error && (
        <ErrorNotice
          className="mb-4"
          message={getErrorMessage(quotes.error)}
          onRetry={() => quotes.refetch()}
        />
      )}
      {accept.error && <ErrorNotice className="mb-4" message={getErrorMessage(accept.error)} />}

      {quotes.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : quotes.error ? null : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="No quotes yet"
            description="Upload a model to get an instant price."
            action={
              <Link to="/portal/upload">
                <Button variant="primary">Get a quote</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((quote) => {
            const status = STATUS[quote.status];
            const accepting = accept.isPending && accept.variables?.id === quote.id;
            return (
              <Card
                key={quote.id}
                className="flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">
                      {quote.model_filename ?? quote.quote_number}
                    </p>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{summary(quote)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {quote.status === 'ordered' && quote.order
                      ? `Order ${quote.order.order_number}`
                      : quote.status === 'priced' && quote.expires_at
                        ? `Valid until ${formatDateTime(quote.expires_at)}`
                        : `Quoted ${formatDate(quote.created_at)}`}
                    {quote.print_time_minutes !== null &&
                      ` · ${formatDuration(quote.print_time_minutes)} and ${formatGrams(quote.weight_grams)} per part`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="tabular text-lg font-semibold text-foreground">
                    {quote.total_cents !== null
                      ? formatMoney(quote.total_cents, quote.currency)
                      : '—'}
                  </p>
                  {quote.status === 'priced' && quote.total_cents !== null ? (
                    <Button
                      variant="primary"
                      size="sm"
                      loading={accepting}
                      disabled={accept.isPending}
                      onClick={() =>
                        accept.mutate({ id: quote.id, expectedTotalCents: quote.total_cents ?? 0 })
                      }
                    >
                      Place order
                    </Button>
                  ) : quote.status === 'ordered' ? (
                    <Link to="/portal/orders">
                      <Button size="sm">Track order</Button>
                    </Link>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
