import { useEffect, useState, type FormEvent } from 'react';
import { Calculator, Plus } from 'lucide-react';

import { useMaterials } from '../../features/materials/hooks/use-materials';
import { usePricingRules, useSavePricingRule } from '../../features/pricing/hooks/use-pricing';
import type { PricingRule } from '../../features/pricing/model/pricing-types';
import { usePrinters } from '../../features/printers/hooks/use-printers';
import { useCurrency } from '../../features/shop/hooks/use-shop';
import { getErrorMessage } from '../../shared/api/api-error-handler';
import { formatMoney } from '../../shared/lib/format';
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorNotice,
  Field,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../../shared/ui';

export function PricingPage() {
  const rules = usePricingRules();
  const printers = usePrinters();
  const materials = useMaterials();
  const currency = useCurrency();
  const [editing, setEditing] = useState<PricingRule | undefined>();
  const [open, setOpen] = useState(false);

  const printerName = new Map((printers.data?.data ?? []).map((p) => [p.id, p.name]));
  const materialName = new Map((materials.data?.data ?? []).map((m) => [m.id, m.name]));
  const rows = rules.data?.data ?? [];

  const scope = (rule: PricingRule) => {
    const parts = [
      rule.printer_id && (printerName.get(rule.printer_id) ?? 'Printer'),
      rule.material_id && (materialName.get(rule.material_id) ?? 'Material'),
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Everything';
  };

  const edit = (rule?: PricingRule) => {
    setEditing(rule);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Pricing"
        description="Rates applied to the slicer's time and grams. The most specific matching rule wins."
        actions={
          <Button variant="primary" onClick={() => edit()}>
            <Plus className="h-4 w-4" />
            Add rule
          </Button>
        }
      />

      {rules.error && (
        <ErrorNotice
          className="mb-4"
          message={getErrorMessage(rules.error)}
          onRetry={() => rules.refetch()}
        />
      )}

      <Card className={rules.error ? 'hidden' : undefined}>
        {rules.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : rules.error ? null : rows.length === 0 ? (
          <EmptyState
            icon={Calculator}
            title="Set your rates"
            description="Quotes can't be priced until there's at least one rule. Start with one that applies to everything."
            action={
              <Button variant="primary" onClick={() => edit()}>
                Add rule
              </Button>
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Applies to</TH>
                <TH className="text-end">Machine / h</TH>
                <TH className="hidden sm:table-cell text-end">Material / g</TH>
                <TH className="hidden md:table-cell text-end">Margin</TH>
                <TH className="hidden md:table-cell text-end">Minimum</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((rule) => (
                <TR key={rule.id} onClick={() => edit(rule)}>
                  <TD className="font-medium">{scope(rule)}</TD>
                  <TD className="tabular text-end">
                    {formatMoney(rule.machine_time_cost_per_minute * 60, currency)}
                  </TD>
                  <TD className="tabular hidden text-end sm:table-cell">
                    {rule.material_cost_per_gram
                      ? formatMoney(rule.material_cost_per_gram, currency)
                      : 'Material price'}
                  </TD>
                  <TD className="tabular hidden text-end md:table-cell">
                    {rule.profit_margin_percentage}%
                  </TD>
                  <TD className="tabular hidden text-end md:table-cell">
                    {rule.minimum_price ? formatMoney(rule.minimum_price, currency) : '—'}
                  </TD>
                  <TD>
                    <Badge tone={rule.is_active ? 'success' : 'neutral'}>
                      {rule.is_active ? 'Active' : 'Off'}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <RuleDialog open={open} onClose={() => setOpen(false)} rule={editing} currency={currency} />
    </>
  );
}

const toMajor = (minor: number | undefined) => (minor ? (minor / 100).toFixed(2) : '');
const toMinor = (major: string) => (major.trim() ? Math.round(Number(major) * 100) : 0);

function RuleDialog({
  open,
  onClose,
  rule,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  rule?: PricingRule;
  currency: string;
}) {
  const printers = usePrinters();
  const materials = useMaterials();
  const save = useSavePricingRule(rule?.id);
  const [form, setForm] = useState({
    printerId: '',
    materialId: '',
    machinePerHour: '',
    materialPerGram: '',
    electricityPerHour: '',
    maintenancePerHour: '',
    failure: '5',
    postFixed: '',
    postPerUnit: '',
    margin: '30',
    minimum: '',
    priority: '0',
    active: true,
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    save.reset();
    setForm({
      printerId: rule?.printer_id ?? '',
      materialId: rule?.material_id ?? '',
      machinePerHour: toMajor(rule ? rule.machine_time_cost_per_minute * 60 : undefined),
      materialPerGram: toMajor(rule?.material_cost_per_gram),
      electricityPerHour: toMajor(rule?.electricity_cost_per_hour),
      maintenancePerHour: toMajor(rule?.maintenance_cost_per_hour),
      failure: rule ? String(rule.failure_risk_percentage) : '5',
      postFixed: toMajor(rule?.post_processing_fixed_cost),
      postPerUnit: toMajor(rule?.post_processing_cost_per_unit),
      margin: rule ? String(rule.profit_margin_percentage) : '30',
      minimum: toMajor(rule?.minimum_price),
      priority: rule ? String(rule.priority) : '0',
      active: rule?.is_active ?? true,
    });
  }, [open, rule]);

  const update = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const perMinute = Math.round(toMinor(form.machinePerHour) / 60);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await save.mutateAsync({
      ...(form.printerId ? { printer_id: form.printerId } : {}),
      ...(form.materialId ? { material_id: form.materialId } : {}),
      machine_time_cost_per_minute: perMinute,
      material_cost_per_gram: toMinor(form.materialPerGram),
      electricity_cost_per_hour: toMinor(form.electricityPerHour),
      maintenance_cost_per_hour: toMinor(form.maintenancePerHour),
      failure_risk_percentage: Number(form.failure) || 0,
      post_processing_fixed_cost: toMinor(form.postFixed),
      post_processing_cost_per_unit: toMinor(form.postPerUnit),
      profit_margin_percentage: Number(form.margin) || 0,
      minimum_price: toMinor(form.minimum),
      priority: Number(form.priority) || 0,
      is_active: form.active,
    });
    onClose();
  };

  const money = (label: string, key: keyof typeof form, hint?: string) => (
    <Field label={`${label} (${currency})`} hint={hint}>
      {(p) => (
        <Input
          {...p}
          type="number"
          min={0}
          step={0.01}
          value={form[key] as string}
          onChange={(e) => update({ [key]: e.target.value })}
          placeholder="0.00"
        />
      )}
    </Field>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={rule ? 'Edit pricing rule' : 'Add pricing rule'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="rule-form" loading={save.isPending}>
            {rule ? 'Save changes' : 'Add rule'}
          </Button>
        </>
      }
    >
      <form id="rule-form" onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Printer" hint="Leave on “Any” to apply to all printers.">
            {(p) => (
              <Select
                {...p}
                value={form.printerId}
                onChange={(e) => update({ printerId: e.target.value })}
              >
                <option value="">Any printer</option>
                {(printers.data?.data ?? []).map((printer) => (
                  <option key={printer.id} value={printer.id}>
                    {printer.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Material">
            {(p) => (
              <Select
                {...p}
                value={form.materialId}
                onChange={(e) => update({ materialId: e.target.value })}
              >
                <option value="">Any material</option>
                {(materials.data?.data ?? []).map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {money(
            'Machine time / hour',
            'machinePerHour',
            perMinute ? `${formatMoney(perMinute, currency)} per minute` : undefined,
          )}
          {money('Electricity / hour', 'electricityPerHour')}
          {money('Maintenance / hour', 'maintenancePerHour')}
          {money('Material / gram', 'materialPerGram', 'Blank uses the material price.')}
          {money('Handling per job', 'postFixed')}
          {money('Handling per part', 'postPerUnit')}
          <Field label="Failure allowance %">
            {(p) => (
              <Input
                {...p}
                type="number"
                min={0}
                max={100}
                value={form.failure}
                onChange={(e) => update({ failure: e.target.value })}
              />
            )}
          </Field>
          <Field label="Margin %">
            {(p) => (
              <Input
                {...p}
                type="number"
                min={0}
                max={100}
                value={form.margin}
                onChange={(e) => update({ margin: e.target.value })}
              />
            )}
          </Field>
          {money('Minimum price', 'minimum')}
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <Field
            label="Priority"
            hint="Breaks ties between equally specific rules."
            className="w-40"
          >
            {(p) => (
              <Input
                {...p}
                type="number"
                value={form.priority}
                onChange={(e) => update({ priority: e.target.value })}
              />
            )}
          </Field>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => update({ active: e.target.checked })}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            Active
          </label>
        </div>
        {save.error && <ErrorNotice message={getErrorMessage(save.error)} />}
      </form>
    </Dialog>
  );
}
