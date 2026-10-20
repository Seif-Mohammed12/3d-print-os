import { useState } from 'react';

import { cn } from '../lib/utils';

export type BarDatum = { key: string; label: string; value: number; display: string };

function niceMax(value: number): number {
  if (value <= 0) {
    return 1;
  }
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value / 4) ?? 10;
  return Math.ceil(value / (step * magnitude)) * step * magnitude;
}

/**
 * Single-series bar chart (one hue, so no legend; the card title names the series).
 * Each column is a full-height hover target with a tooltip.
 */
export function BarChart({
  data,
  formatTick,
  ariaLabel,
}: {
  data: BarDatum[];
  formatTick: (value: number) => string;
  ariaLabel: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const ticks = [max, max / 2, 0];
  const labelEvery = Math.ceil(Math.max(data.length, 1) / 8);

  return (
    <figure aria-label={ariaLabel} className="flex gap-2" onMouseLeave={() => setActive(null)}>
      <div className="flex h-44 w-14 shrink-0 flex-col justify-between text-end">
        {ticks.map((tick) => (
          <span key={tick} className="tabular -my-1.5 text-[11px] text-muted-foreground">
            {formatTick(tick)}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative h-44">
          {ticks.map((tick) => (
            <div
              key={tick}
              className="absolute inset-x-0 border-t border-border"
              style={{ top: `${(1 - tick / max) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((datum, index) => (
              <div
                key={datum.key}
                className="relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setActive(index)}
              >
                <div
                  className={cn(
                    'w-3/5 max-w-6 rounded-t-[4px] transition-colors',
                    active === null || active === index ? 'bg-primary' : 'bg-primary/40',
                  )}
                  style={{ height: `${(datum.value / max) * 100}%` }}
                />
                {active === index && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-popover">
                    <p className="text-muted-foreground">{datum.label}</p>
                    <p className="tabular font-semibold text-foreground">{datum.display}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-1.5 flex gap-[2px] text-[11px] text-muted-foreground">
          {data.map((datum, index) => (
            <span key={datum.key} className="flex-1 truncate text-center">
              {index % labelEvery === 0 ? datum.label : ''}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}
