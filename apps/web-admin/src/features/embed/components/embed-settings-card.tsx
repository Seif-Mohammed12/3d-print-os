import { useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, Plus, RefreshCw, X } from 'lucide-react';

import { usePrinters } from '../../printers/hooks/use-printers';
import { getErrorMessage } from '../../../shared/api/api-error-handler';
import { useToast } from '../../../shared/components/feedback/toast-provider';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  ErrorNotice,
  Field,
  Input,
  Skeleton,
} from '../../../shared/ui';
import type { EmbedSettings } from '../api/embed-settings-api';
import {
  useEmbedSettings,
  useRotateEmbedKey,
  useUpdateEmbedSettings,
} from '../hooks/use-embed-settings';

const DEFAULT_ACCENT = '#0f9488';

/** The snippet a shop pastes into its website. The loader is served by this app. */
export function embedSnippet(settings: Pick<EmbedSettings, 'publishable_key'>, origin: string) {
  return [
    `<script src="${origin}/embed.js" async></script>`,
    `<print-quoter data-key="${settings.publishable_key}"></print-quoter>`,
  ].join('\n');
}

/** "www.example.com" → "https://www.example.com"; the API validates and normalizes it. */
function toOrigin(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Staff: turn the website quoter on, say which websites may use it, and get the snippet. */
export function EmbedSettingsCard() {
  const settings = useEmbedSettings();
  const update = useUpdateEmbedSettings();
  const rotate = useRotateEmbedKey();
  const printers = usePrinters({ status: 'active' });
  const toast = useToast();
  const [newOrigin, setNewOrigin] = useState('');
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [font, setFont] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);

  const data = settings.data;
  useEffect(() => {
    if (data) {
      setAccent(data.theme.accent ?? DEFAULT_ACCENT);
      setFont(data.theme.font_family ?? '');
    }
  }, [data]);

  const quotable = (printers.data?.data ?? []).filter((printer) => printer.technology === 'FDM');

  const save = async (input: Parameters<typeof update.mutateAsync>[0], message: string) => {
    try {
      await update.mutateAsync(input);
      toast.success(message);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    }
  };

  if (settings.isLoading) {
    return (
      <Card>
        <CardHeader title="Website quoter" />
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }
  if (settings.error || !data) {
    return (
      <Card>
        <CardHeader title="Website quoter" />
        <CardContent>
          <ErrorNotice
            message={getErrorMessage(settings.error)}
            onRetry={() => settings.refetch()}
          />
        </CardContent>
      </Card>
    );
  }

  const snippet = embedSnippet(data, window.location.origin);
  const selectedPrinters = data.printer_ids;

  const addOrigin = async (event: FormEvent) => {
    event.preventDefault();
    if (!newOrigin.trim()) {
      return;
    }
    const ok = await save(
      { allowedOrigins: [...data.allowed_origins, toOrigin(newOrigin)] },
      'Website added',
    );
    if (ok) {
      setNewOrigin('');
    }
  };

  const togglePrinter = (id: string, on: boolean) => {
    const current = selectedPrinters ?? quotable.map((p) => p.id);
    const next = on ? [...new Set([...current, id])] : current.filter((p) => p !== id);
    if (next.length === 0) {
      toast.error('Offer at least one printer');
      return;
    }
    const all = quotable.every((p) => next.includes(p.id));
    void save({ printerIds: all ? null : next }, 'Printers saved');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed. Select the snippet and copy it by hand.');
    }
  };

  return (
    <Card>
      <CardHeader
        title="Website quoter"
        description="Let visitors to your own website upload a model, get a slicer price and order."
        action={
          <Badge tone={data.is_enabled ? 'success' : 'neutral'}>
            {data.is_enabled ? 'On' : 'Off'}
          </Badge>
        }
      />
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={data.is_enabled}
              disabled={update.isPending}
              onChange={(e) =>
                void save(
                  { isEnabled: e.target.checked },
                  e.target.checked ? 'Website quoter turned on' : 'Website quoter turned off',
                )
              }
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            Take quotes and orders on my website
          </label>

          <div>
            <h3 className="text-[13px] font-semibold text-foreground">Allowed websites</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              The quoter only works on these addresses. Add each one exactly, including www if your
              site uses it.
            </p>
            {data.allowed_origins.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {data.allowed_origins.map((origin) => (
                  <li
                    key={origin}
                    className="inline-flex h-8 items-center gap-1 rounded-full border border-input bg-card pl-3 pr-1 font-mono text-xs text-foreground"
                  >
                    {origin}
                    <button
                      type="button"
                      aria-label={`Remove ${origin}`}
                      disabled={update.isPending}
                      onClick={() =>
                        void save(
                          { allowedOrigins: data.allowed_origins.filter((o) => o !== origin) },
                          'Website removed',
                        )
                      }
                      className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-warning">
                No websites yet: the quoter won't load anywhere until you add one.
              </p>
            )}
            <form onSubmit={addOrigin} className="mt-2 flex gap-2">
              <Input
                aria-label="Website address"
                placeholder="https://www.yourshop.com"
                value={newOrigin}
                onChange={(e) => setNewOrigin(e.target.value)}
              />
              <Button type="submit" loading={update.isPending}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add
              </Button>
            </form>
          </div>

          <fieldset>
            <legend className="text-[13px] font-semibold text-foreground">Printers offered</legend>
            {quotable.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Add an active FDM printer to offer instant prices.
              </p>
            ) : (
              <div className="mt-1.5 space-y-1.5">
                {quotable.map((printer) => (
                  <label
                    key={printer.id}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={!selectedPrinters || selectedPrinters.includes(printer.id)}
                      disabled={update.isPending}
                      onChange={(e) => togglePrinter(printer.id, e.target.checked)}
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                    />
                    {printer.name}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold text-foreground">Embed code</h3>
              <Button size="sm" onClick={() => void copy()}>
                {copied ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Paste this where the quoter should appear on your website.
            </p>
            <pre className="mt-2 overflow-x-auto rounded-[10px] border border-border bg-muted p-3 font-mono text-xs leading-relaxed text-foreground">
              {snippet}
            </pre>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Key <span className="font-mono text-foreground">{data.publishable_key}</span> is
                public; it only works on the websites above.
              </span>
              <Button size="sm" variant="ghost" onClick={() => setConfirmRotate(true)}>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                New key
              </Button>
            </div>
          </div>

          <form
            className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              const { font_family: _previous, ...rest } = data.theme;
              void save(
                {
                  theme: { ...rest, accent, ...(font.trim() ? { font_family: font.trim() } : {}) },
                },
                'Look saved',
              );
            }}
          >
            <Field label="Accent colour">
              {(p) => (
                <Input
                  {...p}
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-10 p-1"
                />
              )}
            </Field>
            <Field label="Font" hint="Your website's font name, e.g. Inter.">
              {(p) => (
                <Input
                  {...p}
                  value={font}
                  placeholder="Figtree"
                  onChange={(e) => setFont(e.target.value)}
                />
              )}
            </Field>
            <Button type="submit" loading={update.isPending} className="sm:mb-6">
              Save look
            </Button>
          </form>
        </div>
      </CardContent>

      <Dialog
        open={confirmRotate}
        onClose={() => setConfirmRotate(false)}
        title="Issue a new key?"
        description="The current snippet stops working at once. Update your website with the new embed code."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRotate(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={rotate.isPending}
              onClick={async () => {
                try {
                  await rotate.mutateAsync();
                  toast.success('New key issued');
                  setConfirmRotate(false);
                } catch (error) {
                  toast.error(getErrorMessage(error));
                }
              }}
            >
              Issue new key
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Visitors in the middle of a quote will need to reload the page.
        </p>
      </Dialog>
    </Card>
  );
}
