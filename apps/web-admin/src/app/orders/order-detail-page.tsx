import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';

import {
  OrderStatusBadge,
  PaymentBadge,
  ProductionBadge,
} from '../../features/orders/components/order-badges';
import {
  useOrder,
  useOrderHistory,
  usePrintOutcome,
  useRecordPrintOutcome,
  useUpdateOrder,
} from '../../features/orders/hooks/use-orders';
import {
  DELIVERY_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  PRODUCTION_STATUS_LABEL,
  type DeliveryStatus,
  type Order,
  type OrderStatus,
  type PaymentStatus,
  type ProductionStatus,
  type UpdateOrderInput,
} from '../../features/orders/model/order-types';
import { usePrinters } from '../../features/printers/hooks/use-printers';
import { getErrorMessage } from '../../shared/api/api-error-handler';
import { useToast } from '../../shared/components/feedback/toast-provider';
import { formatDateTime, formatDuration, formatGrams, formatMoney } from '../../shared/lib/format';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  DetailList,
  ErrorNotice,
  Field,
  Input,
  Select,
  Skeleton,
  Textarea,
} from '../../shared/ui';

export function OrderDetailPage() {
  const { id = '' } = useParams();
  const order = useOrder(id);

  if (order.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (order.error || !order.data) {
    return (
      <ErrorNotice
        message={order.error ? getErrorMessage(order.error) : 'Order not found.'}
        onRetry={() => order.refetch()}
      />
    );
  }
  return <OrderDetail order={order.data} />;
}

function OrderDetail({ order }: { order: Order }) {
  const toast = useToast();
  const update = useUpdateOrder(order.id);
  const history = useOrderHistory(order.id);
  const printers = usePrinters({ status: 'active' });

  const change = async (input: UpdateOrderInput, message: string) => {
    try {
      await update.mutateAsync(input);
      toast.success(message);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const balance = order.total_cents - order.paid_amount_cents;

  return (
    <>
      <Link
        to="/app/orders"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Orders
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-xl font-semibold tracking-tight text-foreground">
              {order.order_number}
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.customer_name ?? 'Customer'} · created {formatDateTime(order.created_at)} ·{' '}
            <Link to={`/app/quotes/${order.quote_id}`} className="text-primary hover:underline">
              View quote
            </Link>
          </p>
        </div>
        <p className="tabular text-2xl font-semibold tracking-tight text-foreground">
          {formatMoney(order.total_cents, order.currency)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Progress" description="Changes are saved as you make them." />
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Order status">
                {(props) => (
                  <Select
                    {...props}
                    value={order.status}
                    disabled={update.isPending}
                    onChange={(e) =>
                      change({ status: e.target.value as OrderStatus }, 'Order status updated')
                    }
                  >
                    {Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Production">
                {(props) => (
                  <Select
                    {...props}
                    value={order.production_status}
                    disabled={update.isPending}
                    onChange={(e) =>
                      change(
                        { productionStatus: e.target.value as ProductionStatus },
                        'Production updated',
                      )
                    }
                  >
                    {Object.entries(PRODUCTION_STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Printer">
                {(props) => (
                  <Select
                    {...props}
                    value={order.printer_id ?? ''}
                    disabled={update.isPending}
                    onChange={(e) =>
                      e.target.value && change({ printerId: e.target.value }, 'Printer assigned')
                    }
                  >
                    <option value="">Not assigned</option>
                    {(printers.data?.data ?? []).map((printer) => (
                      <option key={printer.id} value={printer.id}>
                        {printer.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Delivery">
                {(props) => (
                  <Select
                    {...props}
                    value={order.delivery_status}
                    disabled={update.isPending}
                    onChange={(e) =>
                      change(
                        { deliveryStatus: e.target.value as DeliveryStatus },
                        'Delivery updated',
                      )
                    }
                  >
                    {Object.entries(DELIVERY_STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </CardContent>
          </Card>

          {order.production_status === 'completed' && <PrintOutcomeCard orderId={order.id} />}

          <Card>
            <CardHeader title="History" />
            <CardContent>
              {(history.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
              ) : (
                <ol className="space-y-4">
                  {(history.data ?? []).map((entry) => (
                    <li key={entry.id} className="flex gap-3 text-sm">
                      <Clock
                        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-foreground">
                          {entry.status_type === 'order'
                            ? 'Status'
                            : entry.status_type.replace(/_/g, ' ')}{' '}
                          {entry.old_status
                            ? `${entry.old_status.replace(/_/g, ' ')} → `
                            : 'set to '}
                          {entry.new_status.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(entry.changed_at)}
                          {entry.notes ? ` · ${entry.notes}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <PaymentCard
            order={order}
            balance={balance}
            onChange={change}
            pending={update.isPending}
          />
          <Card>
            <CardHeader title="Summary" />
            <CardContent>
              <DetailList
                items={[
                  { label: 'Subtotal', value: formatMoney(order.subtotal_cents, order.currency) },
                  { label: 'Tax', value: formatMoney(order.tax_cents, order.currency) },
                  { label: 'Total', value: formatMoney(order.total_cents, order.currency) },
                  { label: 'Payment', value: <PaymentBadge status={order.payment_status} /> },
                  {
                    label: 'Production',
                    value: <ProductionBadge status={order.production_status} />,
                  },
                  ...(order.tracking_number
                    ? [{ label: 'Tracking', value: order.tracking_number }]
                    : []),
                ]}
              />
            </CardContent>
          </Card>
          {order.customer_notes && (
            <Card>
              <CardHeader title="Customer notes" />
              <CardContent className="whitespace-pre-line text-sm text-foreground">
                {order.customer_notes}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function PaymentCard({
  order,
  balance,
  onChange,
  pending,
}: {
  order: Order;
  balance: number;
  onChange: (input: UpdateOrderInput, message: string) => Promise<void>;
  pending: boolean;
}) {
  const [amount, setAmount] = useState('');

  const record = async (event: FormEvent) => {
    event.preventDefault();
    const minor = Math.round(Number(amount) * 100);
    if (!Number.isFinite(minor) || minor <= 0) {
      return;
    }
    const paid = Math.min(order.total_cents, order.paid_amount_cents + minor);
    await onChange(
      {
        paidAmountCents: paid,
        paymentStatus: (paid >= order.total_cents ? 'paid' : 'partial') as PaymentStatus,
      },
      'Payment recorded',
    );
    setAmount('');
  };

  return (
    <Card>
      <CardHeader title="Payment" action={<PaymentBadge status={order.payment_status} />} />
      <CardContent className="space-y-4">
        <DetailList
          items={[
            { label: 'Paid', value: formatMoney(order.paid_amount_cents, order.currency) },
            { label: 'Balance', value: formatMoney(Math.max(balance, 0), order.currency) },
          ]}
        />
        {balance > 0 && (
          <form onSubmit={record} className="flex gap-2">
            <Input
              type="number"
              min={0.01}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={(balance / 100).toFixed(2)}
              aria-label={`Amount received in ${order.currency}`}
            />
            <Button type="submit" loading={pending}>
              Record
            </Button>
          </form>
        )}
        {order.payment_status !== 'refunded' && order.paid_amount_cents > 0 && (
          <p className="text-xs text-muted-foreground">
            Status: {PAYMENT_STATUS_LABEL[order.payment_status].toLowerCase()}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PrintOutcomeCard({ orderId }: { orderId: string }) {
  const toast = useToast();
  const outcome = usePrintOutcome(orderId, true);
  const record = useRecordPrintOutcome(orderId);
  const [form, setForm] = useState({ minutes: '', grams: '', notes: '' });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await record.mutateAsync({
        ...(form.minutes ? { actualPrintMinutes: Number(form.minutes) } : {}),
        ...(form.grams ? { actualFilamentGrams: Number(form.grams) } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      });
      toast.success('Print result saved. Future quotes on this printer get more accurate.');
      setForm({ minutes: '', grams: '', notes: '' });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const recorded = outcome.data;
  return (
    <Card>
      <CardHeader
        title="Actual print result"
        description="What the printer really took. This calibrates future quotes."
      />
      <CardContent>
        {recorded && (
          <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Print time</p>
              <p className="tabular font-semibold">
                {formatDuration(recorded.actual_print_minutes)}{' '}
                <span className="font-normal text-muted-foreground">
                  vs {formatDuration(Number(recorded.estimated_print_time_s) / 60)} estimated
                </span>
              </p>
            </div>
            <div className="rounded-lg bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Filament</p>
              <p className="tabular font-semibold">
                {formatGrams(recorded.actual_filament_g)}{' '}
                <span className="font-normal text-muted-foreground">
                  vs {formatGrams(recorded.estimated_filament_g)} estimated
                </span>
              </p>
            </div>
          </div>
        )}
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Print time (minutes)"
            hint="From the printer's job history, without heat-up."
          >
            {(props) => (
              <Input
                {...props}
                type="number"
                min={1}
                value={form.minutes}
                onChange={(e) => setForm({ ...form, minutes: e.target.value })}
              />
            )}
          </Field>
          <Field label="Filament used (g)" hint="Spool weight before minus after.">
            {(props) => (
              <Input
                {...props}
                type="number"
                min={0.1}
                step={0.1}
                value={form.grams}
                onChange={(e) => setForm({ ...form, grams: e.target.value })}
              />
            )}
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            {(props) => (
              <Textarea
                {...props}
                className="min-h-0"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            )}
          </Field>
          <div className="sm:col-span-2">
            <Button
              type="submit"
              loading={record.isPending}
              disabled={!form.minutes && !form.grams}
            >
              {recorded ? 'Update result' : 'Save result'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
