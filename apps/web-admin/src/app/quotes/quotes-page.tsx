import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Plus } from 'lucide-react';

import { QuoteStatusBadge } from '../../features/quotes/components/quote-parts';
import { useQuotes } from '../../features/quotes/hooks/use-quotes';
import type { QuoteStatus } from '../../features/quotes/model/quote-types';
import { getErrorMessage } from '../../shared/api/api-error-handler';
import {
  formatDuration,
  formatMoney,
  formatRelative,
  stripExtension,
} from '../../shared/lib/format';
import { cn } from '../../shared/lib/utils';
import {
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Skeleton,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../../shared/ui';

const FILTERS: Array<{ label: string; value?: QuoteStatus }> = [
  { label: 'All' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Completed', value: 'completed' },
];

const PAGE_SIZE = 20;

export function QuotesPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<QuoteStatus | undefined>();
  const [page, setPage] = useState(1);
  const quotes = useQuotes({ status, page, perPage: PAGE_SIZE });
  const rows = quotes.data?.data ?? [];
  const total = quotes.data?.meta?.total ?? rows.length;

  return (
    <>
      <PageHeader
        title="Quotes"
        description="Every quote is priced from a real slice of the model."
        actions={
          <Link to="/app/quotes/new">
            <Button variant="primary">
              <Plus className="h-4 w-4" />
              New quote
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex gap-1 overflow-x-auto">
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

      {quotes.error && (
        <ErrorNotice
          className="mb-4"
          message={getErrorMessage(quotes.error)}
          onRetry={() => quotes.refetch()}
        />
      )}

      <Card className={quotes.error ? 'hidden' : undefined}>
        {quotes.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : quotes.error ? null : rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={status ? 'No quotes here' : 'Create your first quote'}
            description="Upload a model, pick a printer and material, and get a slicer-accurate price."
            action={
              <Link to="/app/quotes/new">
                <Button variant="primary">New quote</Button>
              </Link>
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Quote</TH>
                <TH>Model</TH>
                <TH className="hidden md:table-cell">Customer</TH>
                <TH className="hidden sm:table-cell">Print time</TH>
                <TH className="text-end">Total</TH>
                <TH>Status</TH>
                <TH className="hidden lg:table-cell">Created</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((quote) => (
                <TR key={quote.id} onClick={() => navigate(`/app/quotes/${quote.id}`)}>
                  <TD className="font-mono text-xs text-muted-foreground">{quote.quote_number}</TD>
                  <TD className="max-w-[14rem] truncate font-medium">
                    {quote.model_filename ? stripExtension(quote.model_filename) : 'Model'}
                  </TD>
                  <TD className="hidden text-muted-foreground md:table-cell">
                    {quote.customer_name ?? '—'}
                  </TD>
                  <TD className="tabular hidden text-muted-foreground sm:table-cell">
                    {quote.estimate_source ? formatDuration(quote.estimated_time_minutes) : '—'}
                  </TD>
                  <TD className="tabular text-end font-medium">
                    {quote.estimate_source ? formatMoney(quote.total_cents, quote.currency) : '—'}
                  </TD>
                  <TD>
                    <QuoteStatusBadge quote={quote} />
                  </TD>
                  <TD className="hidden text-muted-foreground lg:table-cell">
                    {formatRelative(quote.created_at)}
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
