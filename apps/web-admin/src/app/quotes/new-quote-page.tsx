import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, X } from 'lucide-react';

import { CustomerDialog } from '../../features/customers/components/customer-dialog';
import { useCustomers } from '../../features/customers/hooks/use-customers';
import { useMaterials } from '../../features/materials/hooks/use-materials';
import { FileDrop } from '../../features/models/components/file-drop';
import { LazyModelPreview as ModelPreview } from '../../features/models/components/lazy-model-preview';
import type { ModelSize } from '../../features/models/components/model-preview';
import { useModelUpload } from '../../features/models/hooks/use-model-upload';
import { usePrinters } from '../../features/printers/hooks/use-printers';
import { useAnalyzeQuote, useCreateQuote } from '../../features/quotes/hooks/use-quotes';
import type { OrientationMode, SupportsMode } from '../../features/quotes/model/quote-types';
import { useDefaultShopId } from '../../features/shop/hooks/use-shop';
import { getErrorMessage } from '../../shared/api/api-error-handler';
import { useToast } from '../../shared/components/feedback/toast-provider';
import { formatMoney, formatNumber } from '../../shared/lib/format';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  ErrorNotice,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from '../../shared/ui';

const LAYER_HEIGHTS = [
  { value: '', label: 'Printer profile default' },
  { value: '0.12', label: 'Fine · 0.12 mm' },
  { value: '0.16', label: 'Detailed · 0.16 mm' },
  { value: '0.2', label: 'Standard · 0.20 mm' },
  { value: '0.28', label: 'Draft · 0.28 mm' },
];

export function NewQuotePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const shopId = useDefaultShopId();

  const [file, setFile] = useState<File | null>(null);
  const [size, setSize] = useState<ModelSize | null>(null);
  const upload = useModelUpload(shopId);

  const customers = useCustomers();
  const printers = usePrinters({ status: 'active' });
  const materials = useMaterials({ isActive: true });
  const createQuote = useCreateQuote();
  const analyze = useAnalyzeQuote();

  const [customerOpen, setCustomerOpen] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    printerId: '',
    materialId: '',
    layerHeight: '',
    infill: '',
    supports: 'auto' as SupportsMode,
    orientation: 'auto' as OrientationMode,
    notes: '',
  });
  const update = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  const fdmPrinters = useMemo(
    () => (printers.data?.data ?? []).filter((printer) => printer.technology === 'FDM'),
    [printers.data],
  );
  const materialList = materials.data?.data ?? [];

  // Preselect when there's only one sensible choice.
  useEffect(() => {
    if (!form.printerId && fdmPrinters.length === 1) {
      update({ printerId: fdmPrinters[0]!.id });
    }
  }, [fdmPrinters, form.printerId]);

  const selectFile = (next: File) => {
    setFile(next);
    setSize(null);
    upload.mutate(next);
  };

  const clearFile = () => {
    setFile(null);
    setSize(null);
    upload.reset();
  };

  const printer = fdmPrinters.find((p) => p.id === form.printerId);
  const tooBig =
    !!size &&
    !!printer &&
    (size.z > Number(printer.build_volume_z_mm) ||
      Math.min(size.x, size.y) >
        Math.min(Number(printer.build_volume_x_mm), Number(printer.build_volume_y_mm)));

  // With auto orientation the slicer may still find a pose that fits, so only block as-is.
  const blockedBySize = tooBig && form.orientation === 'as_is';
  const working = createQuote.isPending || analyze.isPending;
  const ready = upload.isSuccess && form.customerId && form.printerId && form.materialId && shopId;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || !upload.data || !shopId) {
      return;
    }
    const quote = await createQuote.mutateAsync({
      shopId,
      customerId: form.customerId,
      modelId: upload.data.id,
      printerId: form.printerId,
      materialId: form.materialId,
      supportsMode: form.supports,
      orientationMode: form.orientation,
      ...(form.layerHeight ? { layerHeightMm: Number(form.layerHeight) } : {}),
      ...(form.infill ? { infillPercentage: Number(form.infill) } : {}),
      ...(form.notes.trim() ? { internalNotes: form.notes.trim() } : {}),
    });
    try {
      await analyze.mutateAsync(quote.id);
    } catch (error) {
      toast.error(`Quote saved, but pricing failed: ${getErrorMessage(error)}`);
    }
    navigate(`/app/quotes/${quote.id}`);
  };

  return (
    <>
      <form onSubmit={submit}>
        <PageHeader
          title="New quote"
          description="Upload a model and choose how to print it. The slicer prices it in seconds."
          actions={
            <Link to="/app/quotes">
              <Button type="button">Cancel</Button>
            </Link>
          }
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <Card>
              <CardHeader title="Model" />
              <CardContent>
                {!file ? (
                  <FileDrop onFile={selectFile} />
                ) : (
                  <div className="space-y-3">
                    <ModelPreview file={file} onSize={setSize} className="h-72" />
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
                        onClick={clearFile}
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

            <Card>
              <CardHeader title="Customer" />
              <CardContent>
                <div className="flex gap-2">
                  <Field label="Customer" className="flex-1">
                    {(props) => (
                      <Select
                        {...props}
                        required
                        value={form.customerId}
                        onChange={(e) => update({ customerId: e.target.value })}
                      >
                        <option value="">Choose a customer</option>
                        {(customers.data?.data ?? []).map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name}
                            {customer.business_name ? ` · ${customer.business_name}` : ''}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  <Button
                    type="button"
                    className="mt-[1.6rem]"
                    onClick={() => setCustomerOpen(true)}
                  >
                    New
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader
                title="Print settings"
                description="Leave a setting on its default to use the printer profile."
              />
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Printer"
                  error={
                    blockedBySize
                      ? "This model is bigger than the printer's build volume."
                      : undefined
                  }
                  hint={
                    tooBig
                      ? 'Bigger than the bed as uploaded; it will be re-oriented to fit if possible.'
                      : undefined
                  }
                >
                  {(props) => (
                    <Select
                      {...props}
                      required
                      value={form.printerId}
                      onChange={(e) => update({ printerId: e.target.value })}
                    >
                      <option value="">Choose a printer</option>
                      {fdmPrinters.map((p) => (
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
                      required
                      value={form.materialId}
                      onChange={(e) => update({ materialId: e.target.value })}
                    >
                      <option value="">Choose a material</option>
                      {materialList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                          {m.color ? ` · ${m.color}` : ''} ({formatMoney(m.price_per_gram_cents)}/g)
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Quality">
                  {(props) => (
                    <Select
                      {...props}
                      value={form.layerHeight}
                      onChange={(e) => update({ layerHeight: e.target.value })}
                    >
                      {LAYER_HEIGHTS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Infill %" hint="Blank uses the profile default.">
                  {(props) => (
                    <Input
                      {...props}
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      value={form.infill}
                      onChange={(e) => update({ infill: e.target.value })}
                      placeholder="20"
                    />
                  )}
                </Field>
                <Field label="Supports">
                  {(props) => (
                    <Select
                      {...props}
                      value={form.supports}
                      onChange={(e) => update({ supports: e.target.value as SupportsMode })}
                    >
                      <option value="auto">Where needed</option>
                      <option value="buildplate_only">From the bed only</option>
                      <option value="off">None</option>
                    </Select>
                  )}
                </Field>
                <Field label="Orientation">
                  {(props) => (
                    <Select
                      {...props}
                      value={form.orientation}
                      onChange={(e) => update({ orientation: e.target.value as OrientationMode })}
                    >
                      <option value="auto">Find the cheapest</option>
                      <option value="as_is">Keep as uploaded</option>
                    </Select>
                  )}
                </Field>
                <Field label="Internal notes" className="sm:col-span-2">
                  {(props) => (
                    <Textarea
                      {...props}
                      value={form.notes}
                      onChange={(e) => update({ notes: e.target.value })}
                      placeholder="Only your team sees these."
                    />
                  )}
                </Field>
              </CardContent>
            </Card>
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <Card>
              <CardHeader title="Summary" />
              <CardContent className="space-y-4 text-sm">
                <ul className="space-y-2">
                  {[
                    ['Model uploaded', upload.isSuccess],
                    ['Customer chosen', !!form.customerId],
                    ['Printer chosen', !!form.printerId],
                    ['Material chosen', !!form.materialId],
                  ].map(([label, done]) => (
                    <li key={label as string} className="flex items-center gap-2">
                      <CheckCircle2
                        className={
                          done ? 'h-4 w-4 text-success' : 'h-4 w-4 text-muted-foreground/40'
                        }
                        aria-hidden="true"
                      />
                      <span className={done ? 'text-foreground' : 'text-muted-foreground'}>
                        {label}
                      </span>
                    </li>
                  ))}
                </ul>
                {(createQuote.error || analyze.error) && (
                  <ErrorNotice message={getErrorMessage(createQuote.error ?? analyze.error)} />
                )}
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={!ready || blockedBySize}
                  loading={working}
                >
                  {analyze.isPending ? 'Slicing…' : 'Create and price'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  The model is sliced in a few orientations; bigger parts can take a minute.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      <CustomerDialog
        open={customerOpen}
        onClose={() => setCustomerOpen(false)}
        onSaved={(customer) => update({ customerId: customer.id })}
      />
    </>
  );
}
