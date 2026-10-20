import { Minus, Plus } from 'lucide-react';

import { cn } from '../../../shared/lib/utils';
import { Field, Select } from '../../../shared/ui';
import type { PortalMaterial, PortalQuoteOptions, PrintQuality } from '../api/portal-api';

/** Materials grouped by name ("PLA Basic"), each with its colors. */
export function groupMaterials(materials: PortalMaterial[]) {
  const groups = new Map<string, { key: string; label: string; colors: PortalMaterial[] }>();
  for (const material of materials) {
    const key = `${material.type}|${material.name}`;
    const group = groups.get(key) ?? {
      key,
      label: material.name.toLowerCase().includes(material.type.toLowerCase())
        ? material.name
        : `${material.name} (${material.type})`,
      colors: [],
    };
    group.colors.push(material);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function QuoteChoices({
  options,
  materialId,
  quality,
  quantity,
  disabled,
  onMaterial,
  onQuality,
  onQuantity,
}: {
  options: PortalQuoteOptions;
  materialId: string;
  quality: PrintQuality;
  quantity: number;
  disabled?: boolean;
  onMaterial: (id: string) => void;
  onQuality: (quality: PrintQuality) => void;
  onQuantity: (quantity: number) => void;
}) {
  const groups = groupMaterials(options.materials);
  const group = groups.find((g) => g.colors.some((m) => m.id === materialId)) ?? groups[0];
  const selectedQuality = options.qualities.find((q) => q.code === quality);
  const clamp = (value: number) =>
    Math.min(options.max_quantity, Math.max(1, Math.round(value) || 1));

  return (
    <div className="space-y-4">
      <Field label="Material">
        {(props) => (
          <Select
            {...props}
            value={group?.key ?? ''}
            disabled={disabled}
            onChange={(e) => {
              const next = groups.find((g) => g.key === e.target.value);
              if (next?.colors[0]) {
                onMaterial(next.colors[0].id);
              }
            }}
          >
            {groups.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {group && (
        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-foreground">Color</legend>
          <div className="flex flex-wrap gap-2">
            {group.colors.map((material) => {
              const selected = material.id === materialId;
              return (
                <button
                  key={material.id}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => onMaterial(material.id)}
                  className={cn(
                    'inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium shadow-card transition-colors disabled:opacity-60',
                    selected
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'border-input bg-card text-foreground hover:bg-muted',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="h-3.5 w-3.5 rounded-full border border-border"
                    style={{ background: material.color_code ?? 'transparent' }}
                  />
                  {material.color ?? 'Standard'}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-foreground">Quality</legend>
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-input bg-muted p-1">
          {options.qualities.map((q) => (
            <button
              key={q.code}
              type="button"
              disabled={disabled}
              aria-pressed={q.code === quality}
              onClick={() => onQuality(q.code)}
              className={cn(
                'h-7 rounded-md text-xs font-medium transition-colors disabled:opacity-60',
                q.code === quality
                  ? 'bg-card text-foreground shadow-card'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {q.label}
            </button>
          ))}
        </div>
        {selectedQuality && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {selectedQuality.description} · {selectedQuality.layer_height_mm} mm layers
          </p>
        )}
      </fieldset>

      <Field label="Quantity">
        {(props) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Fewer"
              disabled={disabled || quantity <= 1}
              onClick={() => onQuantity(clamp(quantity - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-input bg-card text-foreground shadow-card hover:bg-muted disabled:opacity-50"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              {...props}
              type="number"
              inputMode="numeric"
              min={1}
              max={options.max_quantity}
              value={quantity}
              disabled={disabled}
              onChange={(e) => onQuantity(clamp(Number(e.target.value)))}
              className="tabular block h-9 w-16 rounded-lg border border-input bg-card text-center text-sm text-foreground shadow-card disabled:opacity-60"
            />
            <button
              type="button"
              aria-label="More"
              disabled={disabled || quantity >= options.max_quantity}
              onClick={() => onQuantity(clamp(quantity + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-input bg-card text-foreground shadow-card hover:bg-muted disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </Field>
    </div>
  );
}
