import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calculator, CheckCircle2, Package, XCircle } from 'lucide-react';

import { useMaterials } from '../../features/materials/hooks/use-materials';
import { usePrinters } from '../../features/printers/hooks/use-printers';
import {
  PriceSummary,
  QuoteStatusBadge,
  RiskList,
  SliceDetails,
} from '../../features/quotes/components/quote-parts';
import {
  useAnalyzeQuote,
  useApproveQuote,
  useConvertQuote,
  useQuote,
  useRejectQuote,
  useUpdateQuote,
} from '../../features/quotes/hooks/use-quotes';
import type { Quote, UpdateQuoteInput } from '../../features/quotes/model/quote-types';
import { getErrorMessage } from '../../shared/api/api-error-handler';
import { useToast } from '../../shared/components/feedback/toast-provider';
import { formatDateTime, formatNumber, stripExtension } from '../../shared/lib/format';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  DetailList,
  Dialog,
  EmptyState,
  ErrorNotice,
  Field,
  Input,
  Select,
  Skeleton,
  Textarea,
} from '../../shared/ui';

const EDITABLE = new Set(['draft', 'pending']);

export function QuoteDetailPage() {
  const { id = '' } = useParams();
  const quote = useQuote(id);

  if (quote.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (quote.error || !quote.data) {
    return (
      <ErrorNotice
        message={quote.error ? getErrorMessage(quote.error) : 'Quote not found.'}
        onRetry={() => quote.refetch()}
      />
    );
  }
  return <QuoteDetail quote={quote.data} />;
}

function QuoteDetail({ quote }: { quote: Quote }) {
  const navigate = useNavigate();
  const toast = useToast();
  const analyze = useAnalyzeQuote();
  const approve = useApproveQuote(quote.id);
  const reject = useRejectQuote(quote.id);
  const convert = useConvertQuote(quote.id);
  const update = useUpdateQuote(quote.id);
  const printers = usePrinters();
  const materials = useMaterials();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const editable = EDITABLE.has(quote.status);
  const priced = quote.estimate_source === 'slicer';
  const printer = printers.data?.data.find((p) => p.id === quote.printer_id);
  const material = materials.data?.data.find((m) => m.id === quote.material_id);
  const title = quote.model_filename ? stripExtension(quote.model_filename) : 'Quote';

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const createOrder = async () => {
    try {
      const order = await convert.mutateAsync();
      navigate(`/app/orders/${order.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <>
      <Link
        to="/app/quotes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Quotes
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <QuoteStatusBadge quote={quote} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono">{quote.quote_number}</span>
            {quote.customer_name ? ` · ${quote.customer_name}` : ''}
            {quote.analyzed_at ? ` · priced ${formatDateTime(quote.analyzed_at)}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editable && (
            <>
              <Button onClick={() => setEditOpen(true)}>Edit settings</Button>
              <Button
                onClick={() => run(() => analyze.mutateAsync(quote.id), 'Quote priced')}
                loading={analyze.isPending}
              >
                <Calculator className="h-4 w-4" />
                {priced ? 'Price again' : 'Price now'}
              </Button>
              <Button onClick={() => setRejectOpen(true)}>
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
              {priced && (
                <Button
                  variant="primary"
                  onClick={() => run(() => approve.mutateAsync(undefined), 'Quote approved')}
                  loading={approve.isPending}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
                </Button>
              )}
            </>
          )}
          {quote.status === 'approved' && (
            <Button variant="primary" onClick={createOrder} loading={convert.isPending}>
              <Package className="h-4 w-4" />
              Create order
            </Button>
          )}
        </div>
      </div>

      {analyze.isPending && (
        <div className="mb-6 rounded-lg border border-primary/30 bg-accent px-4 py-3 text-sm text-accent-foreground">
          Slicing the model in a few orientations. This can take a minute for big parts.
        </div>
      )}
      {quote.status === 'rejected' && quote.rejection_reason && (
        <div className="mb-6">
          <ErrorNotice message={`Rejected: ${quote.rejection_reason}`} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {priced ? (
            <>
              <SliceDetails quote={quote} />
              <RiskList
                factors={quote.risk_factors ?? []}
                warnings={quote.slice_result?.warnings ?? []}
              />
            </>
          ) : (
            <Card>
              <EmptyState
                icon={Calculator}
                title="Not priced yet"
                description="Price the quote to slice the model and calculate time, material and cost."
                action={
                  editable && (
                    <Button
                      variant="primary"
                      onClick={() => run(() => analyze.mutateAsync(quote.id), 'Quote priced')}
                      loading={analyze.isPending}
                    >
                      Price now
                    </Button>
                  )
                }
              />
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {priced && <PriceSummary quote={quote} />}
          <Card>
            <CardHeader title="Print settings" />
            <CardContent>
              <DetailList
                items={[
                  { label: 'Printer', value: printer?.name ?? '—' },
                  {
                    label: 'Material',
                    value: material
                      ? `${material.name}${material.color ? ` · ${material.color}` : ''}`
                      : '—',
                  },
                  {
                    label: 'Layer height',
                    value: quote.layer_height_mm
                      ? `${formatNumber(quote.layer_height_mm, 2)} mm`
                      : 'Profile default',
                  },
                  {
                    label: 'Infill',
                    value:
                      quote.infill_percentage !== null
                        ? `${quote.infill_percentage}%`
                        : 'Profile default',
                  },
                  {
                    label: 'Supports',
                    value: {
                      auto: 'Where needed',
                      buildplate_only: 'From the bed only',
                      off: 'None',
                    }[quote.supports_mode],
                  },
                ]}
              />
            </CardContent>
          </Card>
          {(quote.internal_notes || quote.customer_notes) && (
            <Card>
              <CardHeader title="Notes" />
              <CardContent className="space-y-3 text-sm">
                {quote.customer_notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">From the customer</p>
                    <p className="mt-1 whitespace-pre-line text-foreground">
                      {quote.customer_notes}
                    </p>
                  </div>
                )}
                {quote.internal_notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Internal</p>
                    <p className="mt-1 whitespace-pre-line text-foreground">
                      {quote.internal_notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <RejectDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        loading={reject.isPending}
        onReject={(reason) =>
          run(async () => {
            await reject.mutateAsync(reason);
            setRejectOpen(false);
          }, 'Quote rejected')
        }
      />
      <EditSettingsDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        quote={quote}
        loading={update.isPending || analyze.isPending}
        onSave={(input) =>
          run(async () => {
            await update.mutateAsync(input);
            setEditOpen(false);
            await analyze.mutateAsync(quote.id);
          }, 'Settings saved and quote re-priced')
        }
      />
    </>
  );
}

function RejectDialog({
  open,
  onClose,
  onReject,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onReject: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (open) {
      setReason('');
    }
  }, [open]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Reject quote"
      description="The reason is kept on the quote."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            loading={loading}
            disabled={!reason.trim()}
            onClick={() => onReject(reason.trim())}
          >
            Reject quote
          </Button>
        </>
      }
    >
      <Field label="Reason">
        {(props) => (
          <Textarea
            {...props}
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Too large for our printers"
          />
        )}
      </Field>
    </Dialog>
  );
}

function EditSettingsDialog({
  open,
  onClose,
  quote,
  onSave,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  quote: Quote;
  onSave: (input: UpdateQuoteInput) => void;
  loading: boolean;
}) {
  const printers = usePrinters({ status: 'active' });
  const materials = useMaterials({ isActive: true });
  const [form, setForm] = useState({ printerId: '', materialId: '', layerHeight: '', infill: '' });

  useEffect(() => {
    if (open) {
      setForm({
        printerId: quote.printer_id ?? '',
        materialId: quote.material_id ?? '',
        layerHeight: quote.layer_height_mm ? String(Number(quote.layer_height_mm)) : '',
        infill: quote.infill_percentage !== null ? String(quote.infill_percentage) : '',
      });
    }
  }, [open, quote]);

  const save = () =>
    onSave({
      printerId: form.printerId || undefined,
      materialId: form.materialId || undefined,
      ...(form.layerHeight ? { layerHeightMm: Number(form.layerHeight) } : {}),
      ...(form.infill ? { infillPercentage: Number(form.infill) } : {}),
    });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit print settings"
      description="Saving re-prices the quote."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} loading={loading}>
            Save and re-price
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Printer">
          {(props) => (
            <Select
              {...props}
              value={form.printerId}
              onChange={(e) => setForm({ ...form, printerId: e.target.value })}
            >
              {(printers.data?.data ?? [])
                .filter((p) => p.technology === 'FDM')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </Select>
          )}
        </Field>
        <Field label="Material">
          {(props) => (
            <Select
              {...props}
              value={form.materialId}
              onChange={(e) => setForm({ ...form, materialId: e.target.value })}
            >
              {(materials.data?.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.color ? ` · ${m.color}` : ''}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Layer height (mm)">
          {(props) => (
            <Input
              {...props}
              type="number"
              step={0.02}
              min={0.05}
              max={1}
              value={form.layerHeight}
              onChange={(e) => setForm({ ...form, layerHeight: e.target.value })}
            />
          )}
        </Field>
        <Field label="Infill %">
          {(props) => (
            <Input
              {...props}
              type="number"
              min={0}
              max={100}
              value={form.infill}
              onChange={(e) => setForm({ ...form, infill: e.target.value })}
            />
          )}
        </Field>
      </div>
    </Dialog>
  );
}
