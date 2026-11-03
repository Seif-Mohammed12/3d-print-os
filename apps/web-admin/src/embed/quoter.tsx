import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, X } from 'lucide-react';

import { FileDrop } from '../features/models/components/file-drop';
import { LazyModelPreview as ModelPreview } from '../features/models/components/lazy-model-preview';
import type { ModelSize } from '../features/models/components/model-preview';
import type {
  PortalQuote,
  PortalQuoteOptions,
  PrintQuality,
} from '../features/portal/api/portal-api';
import { QuoteChoices } from '../features/portal/components/quote-choices';
import { type LiveQuoteApi, useLiveQuote } from '../features/portal/hooks/use-live-quote';
import { ApiError, getErrorMessage } from '../shared/api/api-error-handler';
import {
  formatDateTime,
  formatDuration,
  formatGrams,
  formatMoney,
  formatNumber,
} from '../shared/lib/format';
import { cn } from '../shared/lib/utils';
import {
  Button,
  Card,
  CardContent,
  DetailList,
  ErrorNotice,
  Field,
  Input,
  Select,
  Skeleton,
  Textarea,
} from '../shared/ui';
import type { EmbedClient, EmbedConfig, EmbedQuoteChoices } from './embed-api';
import { postToHost } from './frame-bridge';

type Upload = {
  status: 'uploading' | 'done' | 'error';
  progress: number;
  modelId: string | null;
  error: unknown;
};

/** The website quoter: upload, pick printer / material / quality, see the price, order. */
export function Quoter({ client, config }: { client: EmbedClient; config: EmbedConfig }) {
  const [file, setFile] = useState<File | null>(null);
  const [size, setSize] = useState<ModelSize | null>(null);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [printerId, setPrinterId] = useState(config.printers[0]?.id ?? '');
  const [materialId, setMaterialId] = useState(config.printers[0]?.materials[0]?.id ?? '');
  const [quality, setQuality] = useState<PrintQuality>('standard');
  const [quantity, setQuantity] = useState(1);
  const [contact, setContact] = useState({ name: '', email: '', phone: '', notes: '' });
  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState<unknown>(null);
  const [ordered, setOrdered] = useState<PortalQuote | null>(null);

  const printer = config.printers.find((p) => p.id === printerId) ?? config.printers[0];
  // Switching printer keeps the material when the new printer offers it.
  useEffect(() => {
    if (printer && !printer.materials.some((m) => m.id === materialId)) {
      setMaterialId(printer.materials[0]?.id ?? '');
    }
  }, [printer, materialId]);

  const options: PortalQuoteOptions | null = printer
    ? {
        available: true,
        printer: { name: printer.name, build_volume_mm: printer.build_volume_mm },
        materials: printer.materials,
        qualities: printer.qualities,
        max_quantity: config.max_quantity,
        currency: config.currency,
      }
    : null;

  const api = useMemo<LiveQuoteApi<EmbedQuoteChoices>>(
    () => ({
      create: (modelId, choices) => client.createQuote(modelId, choices),
      reprice: (quoteId, choices) => client.repriceQuote(quoteId, choices),
    }),
    [client],
  );
  const choices = useMemo(
    () =>
      printer && printer.materials.some((m) => m.id === materialId)
        ? { printerId: printer.id, materialId, quality, quantity }
        : null,
    [printer, materialId, quality, quantity],
  );
  const live = useLiveQuote(upload?.modelId ?? null, choices, api);

  const startUpload = (next: File) => {
    setFile(next);
    if (next.size > config.upload_max_bytes) {
      setUpload({
        status: 'error',
        progress: 0,
        modelId: null,
        error: new Error(
          `That file is over ${Math.floor(config.upload_max_bytes / 1_048_576)} MB. Try a lighter export.`,
        ),
      });
      return;
    }
    setUpload({ status: 'uploading', progress: 0, modelId: null, error: null });
    client
      .upload(next, (progress) =>
        setUpload((prev) => (prev?.status === 'uploading' ? { ...prev, progress } : prev)),
      )
      .then((model) => setUpload({ status: 'done', progress: 1, modelId: model.id, error: null }))
      .catch((error: unknown) => setUpload({ status: 'error', progress: 0, modelId: null, error }));
  };

  const reset = () => {
    setFile(null);
    setSize(null);
    setUpload(null);
    setQuantity(1);
    setOrdered(null);
    setOrderError(null);
  };

  const quote = live.quote;
  const hasPrice = quote?.status === 'priced' && quote.total_cents !== null;
  const contactOk =
    contact.name.trim().length > 0 && (contact.email.trim() !== '' || contact.phone.trim() !== '');

  const placeOrder = async (event: FormEvent) => {
    event.preventDefault();
    if (!quote || !live.upToDate || quote.total_cents === null || !contactOk) {
      return;
    }
    setOrdering(true);
    setOrderError(null);
    try {
      const result = await client.placeOrder(quote.id, quote.total_cents, {
        name: contact.name.trim(),
        ...(contact.email.trim() ? { email: contact.email.trim() } : {}),
        ...(contact.phone.trim() ? { phone: contact.phone.trim() } : {}),
        ...(contact.notes.trim() ? { notes: contact.notes.trim() } : {}),
      });
      live.replace(result);
      setOrdered(result);
      postToHost({
        type: 'printos:order',
        order: result.order,
        total_cents: result.total_cents,
        currency: result.currency,
      });
    } catch (error) {
      setOrderError(error);
      // The price moved under the visitor (expired, re-priced): show the new one.
      if (error instanceof ApiError && error.statusCode === 409) {
        live.retry();
      }
    } finally {
      setOrdering(false);
    }
  };

  if (ordered) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-stock-done-soft text-stock-done-ink">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-xl font-bold text-foreground">Order placed</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {ordered.order ? (
              <>
                Order{' '}
                <span className="font-mono text-foreground">{ordered.order.order_number}</span> for{' '}
                {formatMoney(ordered.total_cents, ordered.currency)}.{' '}
              </>
            ) : null}
            {config.shop_name} will contact you to confirm payment and delivery.
          </p>
          <Button className="mt-6" onClick={reset}>
            Quote another part
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!config.available || !options) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <h2 className="text-base font-semibold text-foreground">
            Online quoting isn't available right now
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Please contact {config.shop_name} for a quote.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={placeOrder} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_20rem]">
      <Card className="md:self-start">
        <CardContent>
          {!file ? (
            <FileDrop title="Drop your STL file here" onFile={startUpload} />
          ) : (
            <div className="space-y-3">
              <ModelPreview file={file} onSize={setSize} className="h-72" />
              <div className="flex items-center gap-3 text-sm">
                {upload?.status === 'uploading' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-foreground" aria-hidden="true" />
                ) : upload?.status === 'done' ? (
                  <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                ) : null}
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                  {file.name}
                </span>
                <span className="tabular text-muted-foreground">
                  {upload?.status === 'uploading'
                    ? `Uploading ${Math.round(upload.progress * 100)}%`
                    : size
                      ? `${formatNumber(size.x, 1)} × ${formatNumber(size.y, 1)} × ${formatNumber(size.z, 1)} mm`
                      : ''}
                </span>
                <button
                  type="button"
                  onClick={reset}
                  className="-m-1 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Remove model"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {upload?.status === 'error' && (
                <ErrorNotice
                  message={getErrorMessage(upload.error)}
                  onRetry={
                    file.size <= config.upload_max_bytes ? () => startUpload(file) : undefined
                  }
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="md:self-start">
        <CardContent className="space-y-5">
          {config.printers.length > 1 && (
            <Field label="Printer">
              {(props) => (
                <Select
                  {...props}
                  value={printer?.id ?? ''}
                  disabled={ordering}
                  onChange={(e) => setPrinterId(e.target.value)}
                >
                  {config.printers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          <QuoteChoices
            options={options}
            materialId={materialId}
            quality={quality}
            quantity={quantity}
            disabled={ordering}
            onMaterial={setMaterialId}
            onQuality={setQuality}
            onQuantity={setQuantity}
          />

          <div className="border-t border-border pt-4" aria-live="polite">
            {upload?.status !== 'done' ? (
              <p className="text-sm text-muted-foreground">
                {upload?.status === 'uploading'
                  ? 'Uploading your model…'
                  : 'Upload a model to see your price.'}
              </p>
            ) : !quote && live.pricing ? (
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm text-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Slicing your model for an exact price…
                </p>
                <Skeleton className="h-7 w-1/2" />
              </div>
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

          {hasPrice && (
            <fieldset className="space-y-3 border-t border-border pt-4">
              <legend className="sr-only">Your details</legend>
              <Field label="Name">
                {(props) => (
                  <Input
                    {...props}
                    autoComplete="name"
                    required
                    value={contact.name}
                    onChange={(e) => setContact({ ...contact, name: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Email">
                {(props) => (
                  <Input
                    {...props}
                    type="email"
                    autoComplete="email"
                    value={contact.email}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Phone" hint="Email or phone, so the shop can reach you.">
                {(props) => (
                  <Input
                    {...props}
                    type="tel"
                    autoComplete="tel"
                    value={contact.phone}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Notes for the shop">
                {(props) => (
                  <Textarea
                    {...props}
                    rows={2}
                    value={contact.notes}
                    onChange={(e) => setContact({ ...contact, notes: e.target.value })}
                    placeholder="Deadline, how it will be used…"
                  />
                )}
              </Field>
            </fieldset>
          )}

          {orderError ? <ErrorNotice message={getErrorMessage(orderError)} /> : null}
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={!live.upToDate || !contactOk}
            loading={ordering}
          >
            {hasPrice && live.upToDate
              ? `Place order · ${formatMoney(quote.total_cents, quote.currency)}`
              : 'Place order'}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
