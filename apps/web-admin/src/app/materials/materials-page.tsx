import { useEffect, useState, type FormEvent } from 'react';
import { Boxes, Plus } from 'lucide-react';

import { useMaterials, useSaveMaterial } from '../../features/materials/hooks/use-materials';
import { MATERIAL_TYPES, type Material } from '../../features/materials/model/material-types';
import { useCurrency } from '../../features/shop/hooks/use-shop';
import { getErrorMessage } from '../../shared/api/api-error-handler';
import { formatMoney, formatNumber } from '../../shared/lib/format';
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

export function MaterialsPage() {
  const materials = useMaterials();
  const currency = useCurrency();
  const [editing, setEditing] = useState<Material | undefined>();
  const [open, setOpen] = useState(false);
  const rows = materials.data?.data ?? [];

  const edit = (material?: Material) => {
    setEditing(material);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Materials"
        description="Filaments you sell, with the price per gram and density used for quotes."
        actions={
          <Button variant="primary" onClick={() => edit()}>
            <Plus className="h-4 w-4" />
            Add material
          </Button>
        }
      />

      {materials.error && (
        <ErrorNotice
          className="mb-4"
          message={getErrorMessage(materials.error)}
          onRetry={() => materials.refetch()}
        />
      )}

      <Card className={materials.error ? 'hidden' : undefined}>
        {materials.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : materials.error ? null : rows.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="Add your first material"
            description="Each quote needs a material for its weight and price."
            action={
              <Button variant="primary" onClick={() => edit()}>
                Add material
              </Button>
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Material</TH>
                <TH>Type</TH>
                <TH className="text-end">Price / g</TH>
                <TH className="hidden sm:table-cell text-end">Price / kg</TH>
                <TH className="hidden md:table-cell">Density</TH>
                <TH className="hidden md:table-cell">Nozzle</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((material) => (
                <TR key={material.id} onClick={() => edit(material)}>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-4 w-4 shrink-0 rounded-full border border-border"
                        style={{ background: material.color_code ?? 'transparent' }}
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-medium text-foreground">{material.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[material.brand, material.color].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                    </div>
                  </TD>
                  <TD>{material.material_type}</TD>
                  <TD className="tabular text-end">
                    {formatMoney(material.price_per_gram_cents, currency)}
                  </TD>
                  <TD className="tabular hidden text-end sm:table-cell">
                    {formatMoney(material.price_per_gram_cents * 1000, currency)}
                  </TD>
                  <TD className="tabular hidden md:table-cell">
                    {formatNumber(material.density_g_per_cm3, 2)} g/cm³
                  </TD>
                  <TD className="tabular hidden md:table-cell">
                    {material.nozzle_temperature_min_celsius
                      ? `${material.nozzle_temperature_min_celsius}–${material.nozzle_temperature_max_celsius ?? '?'} °C`
                      : '—'}
                  </TD>
                  <TD>
                    <Badge tone={material.is_active ? 'success' : 'neutral'}>
                      {material.is_active ? 'Active' : 'Hidden'}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <MaterialDialog
        open={open}
        onClose={() => setOpen(false)}
        material={editing}
        currency={currency}
      />
    </>
  );
}

function MaterialDialog({
  open,
  onClose,
  material,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  material?: Material;
  currency: string;
}) {
  const save = useSaveMaterial(material?.id);
  const [form, setForm] = useState({
    name: '',
    brand: '',
    type: 'PLA',
    color: '',
    colorCode: '#4f46e5',
    density: '1.24',
    price: '',
    nozzleMin: '',
    nozzleMax: '',
    bedMin: '',
    bedMax: '',
    active: true,
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    save.reset();
    const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
    setForm({
      name: material?.name ?? '',
      brand: material?.brand ?? '',
      type: material?.material_type ?? 'PLA',
      color: material?.color ?? '',
      colorCode: material?.color_code ?? '#4f46e5',
      density: material ? String(Number(material.density_g_per_cm3)) : '1.24',
      price: material ? (material.price_per_gram_cents / 100).toFixed(2) : '',
      nozzleMin: s(material?.nozzle_temperature_min_celsius),
      nozzleMax: s(material?.nozzle_temperature_max_celsius),
      bedMin: s(material?.bed_temperature_min_celsius),
      bedMax: s(material?.bed_temperature_max_celsius),
      active: material?.is_active ?? true,
    });
  }, [open, material]);

  const update = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const num = (v: string) => (v.trim() ? Number(v) : undefined);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await save.mutateAsync({
      name: form.name.trim(),
      brand: form.brand.trim() || undefined,
      materialType: form.type,
      color: form.color.trim() || undefined,
      colorCode: form.colorCode,
      densityGPerCm3: Number(form.density),
      pricePerGramCents: Math.max(1, Math.round(Number(form.price) * 100)),
      nozzleTemperatureMinCelsius: num(form.nozzleMin),
      nozzleTemperatureMaxCelsius: num(form.nozzleMax),
      bedTemperatureMinCelsius: num(form.bedMin),
      bedTemperatureMaxCelsius: num(form.bedMax),
      isActive: form.active,
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={material ? 'Edit material' : 'Add material'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="material-form" loading={save.isPending}>
            {material ? 'Save changes' : 'Add material'}
          </Button>
        </>
      }
    >
      <form id="material-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
        <Field label="Name" className="sm:col-span-2">
          {(p) => (
            <Input
              {...p}
              required
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="PETG Black"
            />
          )}
        </Field>
        <Field label="Type">
          {(p) => (
            <Select {...p} value={form.type} onChange={(e) => update({ type: e.target.value })}>
              {MATERIAL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Brand">
          {(p) => (
            <Input
              {...p}
              value={form.brand}
              onChange={(e) => update({ brand: e.target.value })}
              placeholder="eSUN"
            />
          )}
        </Field>
        <Field label="Color">
          {(p) => (
            <Input
              {...p}
              value={form.color}
              onChange={(e) => update({ color: e.target.value })}
              placeholder="Black"
            />
          )}
        </Field>
        <Field label="Swatch">
          {(p) => (
            <Input
              {...p}
              type="color"
              className="h-9 p-1"
              value={form.colorCode}
              onChange={(e) => update({ colorCode: e.target.value })}
            />
          )}
        </Field>
        <Field
          label={`Price per gram (${currency})`}
          hint={
            form.price
              ? `${formatMoney(Math.round(Number(form.price) * 100000), currency)} per kg`
              : undefined
          }
        >
          {(p) => (
            <Input
              {...p}
              type="number"
              min={0.01}
              step={0.01}
              required
              value={form.price}
              onChange={(e) => update({ price: e.target.value })}
              placeholder="1.50"
            />
          )}
        </Field>
        <Field label="Density (g/cm³)" hint="PLA 1.24 · PETG 1.27 · ABS 1.04">
          {(p) => (
            <Input
              {...p}
              type="number"
              min={0.5}
              max={5}
              step={0.01}
              required
              value={form.density}
              onChange={(e) => update({ density: e.target.value })}
            />
          )}
        </Field>
        <label className="flex items-center gap-2 self-center text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => update({ active: e.target.checked })}
            className="h-4 w-4 accent-[hsl(var(--primary))]"
          />
          Offer in quotes
        </label>
        <Field label="Nozzle min °C">
          {(p) => (
            <Input
              {...p}
              type="number"
              value={form.nozzleMin}
              onChange={(e) => update({ nozzleMin: e.target.value })}
            />
          )}
        </Field>
        <Field label="Nozzle max °C">
          {(p) => (
            <Input
              {...p}
              type="number"
              value={form.nozzleMax}
              onChange={(e) => update({ nozzleMax: e.target.value })}
            />
          )}
        </Field>
        <Field label="Bed °C">
          {(p) => (
            <Input
              {...p}
              type="number"
              value={form.bedMin}
              onChange={(e) => update({ bedMin: e.target.value, bedMax: e.target.value })}
            />
          )}
        </Field>
        {save.error && (
          <div className="sm:col-span-3">
            <ErrorNotice message={getErrorMessage(save.error)} />
          </div>
        )}
      </form>
    </Dialog>
  );
}
