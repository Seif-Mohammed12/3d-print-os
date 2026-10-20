import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, Printer, X } from 'lucide-react';

import { FileDrop } from '../../features/models/components/file-drop';
import { LazyModelPreview as ModelPreview } from '../../features/models/components/lazy-model-preview';
import type { ModelSize } from '../../features/models/components/model-preview';
import { useModelUpload } from '../../features/models/hooks/use-model-upload';
import type { PortalQuote, PrintQuality } from '../../features/portal/api/portal-api';
import { QuoteChoices } from '../../features/portal/components/quote-choices';
import { useLiveQuote } from '../../features/portal/hooks/use-live-quote';
import { useAcceptQuote, usePortalQuoteOptions } from '../../features/portal/hooks/use-portal';
import { ApiError, getErrorMessage } from '../../shared/api/api-error-handler';
import {
  formatDateTime,
  formatDuration,
  formatGrams,
  formatMoney,
  formatNumber,
} from '../../shared/lib/format';
import { cn } from '../../shared/lib/utils';
import {
  Button,
  Card,
  CardContent,
  DetailList,
  EmptyState,
  ErrorNotice,
  Field,
  Skeleton,
  Textarea,
} from '../../shared/ui';

const STEPS = ['Upload your model', 'Pick material and quality', 'Order at the price you see'];

export function PortalUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [size, setSize] = useState<ModelSize | null>(null);
  const [materialId, setMaterialId] = useState('');
  const [quality, setQuality] = useState<PrintQuality>('standard');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [ordered, setOrdered] = useState<PortalQuote | null>(null);

  const options = usePortalQuoteOptions();
  const upload = useModelUpload(undefined);
  const accept = useAcceptQuote();

  // Default to the shop's first material once the options arrive.
  const firstMaterial = options.data?.materials[0]?.id;
  useEffect(() => {
    if (!materialId && firstMaterial) {
      setMaterialId(firstMaterial);
    }
  }, [materialId, firstMaterial]);

  const choices = useMemo(
    () => (materialId ? { materialId, quality, quantity } : null),
    [materialId, quality, quantity],
  );
  const live = useLiveQuote(upload.data?.id ?? null, choices);

  const reset = () => {
    setFile(null);
    setSize(null);
    setQuantity(1);
    setNotes('');
    setOrdered(null);
    upload.reset();
    accept.reset();
  };

  const placeOrder = async (event: FormEvent) => {
    event.preventDefault();
    const quote = live.quote;
    if (!quote || !live.upToDate || quote.total_cents === null) {
      return;
    }
    try {
      const result = await accept.mutateAsync({
        id: quote.id,
        expectedTotalCents: quote.total_cents,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      live.replace(result);
      setOrdered(result);
    } catch (error) {
      // The price moved under the customer (expired, re-priced elsewhere): show the new one.
      if (error instanceof ApiError && error.statusCode === 409) {
        live.retry();
      }
    }
  };

  if (ordered) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-foreground">Order placed</h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {ordered.order ? (
              <>
                Order{' '}
                <span className="font-mono text-foreground">{ordered.order.order_number}</span> for{' '}
                {formatMoney(ordered.total_cents, ordered.currency)}.{' '}
              </>
            ) : null}
            We'll start printing soon. You can follow it under Your orders.
          </p>
          <div className="mt-6 flex gap-2">
            <Button onClick={reset}>Quote another part</Button>
            <Link to="/portal/orders">
              <Button variant="primary">View your orders</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const quote = live.quote;
  const hasPrice = quote?.status === 'priced' && quote.total_cents !== null;
  const unavailable = options.data && !options.data.available;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Get a quote</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload an STL and get an instant price, sliced for our printer.
        </p>
        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-card"
            >
              <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                {index + 1}
              </span>
              <span className="text-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <form onSubmit={placeOrder} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardContent>
            {!file ? (
              <FileDrop
                title="Drop your STL file here"
                onFile={(next) => {
                  setFile(next);
                  upload.mutate(next);
                }}
              />
            ) : (
              <div className="space-y-3">
                <ModelPreview file={file} onSize={setSize} className="h-80" />
                <div className="flex items-center gap-3 text-sm">
                  {upload.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                  ) : upload.isSuccess ? (
                    <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                  ) : null}
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                    {file.name}
                  </span>
                  <span className="tabular text-muted-foreground">
                    {upload.isPending
                      ? `Uploading ${Math.round(upload.progress * 100)}%`
                      : size
                        ? `${formatNumber(size.x, 1)} × ${formatNumber(size.y, 1)} × ${formatNumber(size.z, 1)} mm`
                        : ''}
                  </span>
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                    aria-label="Remove model"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {upload.error && (
                  <ErrorNotice
                    message={getErrorMessage(upload.error)}
                    onRetry={() => upload.mutate(file)}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:self-start">
          {options.isLoading ? (
            <CardContent className="space-y-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          ) : options.error ? (
            <CardContent>
              <ErrorNotice
                message={getErrorMessage(options.error)}
                onRetry={() => options.refetch()}
              />
            </CardContent>
          ) : unavailable || !options.data ? (
            <EmptyState
              icon={Printer}
              title="Online quoting isn't available yet"
              description="The shop hasn't set up instant prices. Please contact them for a quote."
            />
          ) : (
            <CardContent className="space-y-5">
              <QuoteChoices
                options={options.data}
                materialId={materialId}
                quality={quality}
                quantity={quantity}
                disabled={accept.isPending}
                onMaterial={setMaterialId}
                onQuality={setQuality}
                onQuantity={setQuantity}
              />

              <div className="rounded-lg border border-border bg-muted/50 p-4" aria-live="polite">
                {!upload.isSuccess ? (
                  <p className="text-sm text-muted-foreground">
                    {file ? 'Uploading your model…' : 'Upload a model to see your price.'}
                  </p>
                ) : !quote && live.pricing ? (
                  <PricingPlaceholder />
                ) : (
                  <>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-muted-foreground">
                        Total{quantity > 1 ? ` for ${quantity}` : ''}
                      </span>
                      <span
                        className={cn(
                          'tabular text-2xl font-semibold text-foreground transition-opacity',
                          live.pricing && 'opacity-40',
                        )}
                      >
                        {hasPrice ? formatMoney(quote.total_cents, quote.currency) : '—'}
                      </span>
                    </div>
                    <p className="mt-0.5 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                      {live.pricing ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                          Updating price…
                        </>
                      ) : hasPrice && quote.expires_at ? (
                        `Tax included · valid until ${formatDateTime(quote.expires_at)}`
                      ) : (
                        'Tax included'
                      )}
                    </p>
                    {hasPrice && (
                      <div className={cn('mt-3', live.pricing && 'opacity-40')}>
                        <DetailList
                          items={[
                            {
                              label: 'Print time per part',
                              value: formatDuration(quote.print_time_minutes),
                            },
                            { label: 'Material per part', value: formatGrams(quote.weight_grams) },
                            {
                              label: 'Size',
                              value: quote.dimensions_mm
                                ? `${formatNumber(quote.dimensions_mm.x, 1)} × ${formatNumber(quote.dimensions_mm.y, 1)} × ${formatNumber(quote.dimensions_mm.z, 1)} mm`
                                : '—',
                            },
                          ]}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              {live.error ? (
                <ErrorNotice message={getErrorMessage(live.error)} onRetry={live.retry} />
              ) : null}

              <Field
                label="Notes for the shop"
                hint="Deadline, how it will be used, anything else."
              >
                {(props) => (
                  <Textarea
                    {...props}
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Needed by Thursday"
                  />
                )}
              </Field>

              {accept.error && <ErrorNotice message={getErrorMessage(accept.error)} />}
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={!live.upToDate}
                loading={accept.isPending}
              >
                {hasPrice && live.upToDate
                  ? `Place order · ${formatMoney(quote.total_cents, quote.currency)}`
                  : 'Place order'}
              </Button>
            </CardContent>
          )}
        </Card>
      </form>
    </div>
  );
}

function PricingPlaceholder() {
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm text-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
        Slicing your model for an exact price…
      </p>
      <Skeleton className="h-7 w-1/2" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
