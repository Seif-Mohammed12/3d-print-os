import { useEffect, useState, type FormEvent } from 'react';

import { PortalPrinterCard } from '../../features/portal/components/portal-printer-card';
import { useTenantSettings, useUpdateTenant } from '../../features/shop/hooks/use-shop';
import { getErrorMessage } from '../../shared/api/api-error-handler';
import { useToast } from '../../shared/components/feedback/toast-provider';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  DetailList,
  ErrorNotice,
  Field,
  Input,
  PageHeader,
  Select,
  Skeleton,
} from '../../shared/ui';

const TIMEZONES = [
  'Africa/Cairo',
  'Asia/Riyadh',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Berlin',
  'UTC',
];

export function ShopSettingsPage() {
  const tenant = useTenantSettings();
  const update = useUpdateTenant();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', timezone: 'Africa/Cairo', tax: '0' });

  useEffect(() => {
    if (tenant.data) {
      setForm({
        name: tenant.data.name,
        timezone: tenant.data.timezone,
        tax: String((tenant.data.tax_rate_bps ?? 0) / 100),
      });
    }
  }, [tenant.data]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await update.mutateAsync({
        name: form.name.trim(),
        timezone: form.timezone,
        taxRateBps: Math.round(Number(form.tax) * 100),
      });
      toast.success('Settings saved');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (tenant.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (tenant.error || !tenant.data) {
    return <ErrorNotice message={getErrorMessage(tenant.error)} onRetry={() => tenant.refetch()} />;
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your shop details and how tax is added to quotes."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader title="Shop" />
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <Field label="Business name">
                {(p) => (
                  <Input
                    {...p}
                    required
                    minLength={2}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                )}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Time zone">
                  {(p) => (
                    <Select
                      {...p}
                      value={form.timezone}
                      onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                    >
                      {[...new Set([form.timezone, ...TIMEZONES])].map((zone) => (
                        <option key={zone} value={zone}>
                          {zone}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Tax / VAT %" hint="Added on top of every quote. Egypt VAT is 14%.">
                  {(p) => (
                    <Input
                      {...p}
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={form.tax}
                      onChange={(e) => setForm({ ...form, tax: e.target.value })}
                    />
                  )}
                </Field>
              </div>
              <Button type="submit" variant="primary" loading={update.isPending}>
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Account" />
            <CardContent>
              <DetailList
                items={[
                  {
                    label: 'Shop address',
                    value: <span className="font-mono text-xs">{tenant.data.slug}</span>,
                  },
                  { label: 'Currency', value: tenant.data.default_currency },
                ]}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Customers sign up to your portal with the shop address above. Changing currency
                affects new quotes only.
              </p>
            </CardContent>
          </Card>
          <PortalPrinterCard />
        </div>
      </div>
    </>
  );
}
