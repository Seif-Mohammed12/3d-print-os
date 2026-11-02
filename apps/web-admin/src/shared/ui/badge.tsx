import type { ReactNode } from 'react';

import { cn } from '../lib/utils';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

// Flags and attributes (Business, Active, Default). Statuses use StockTag instead.
const tones: Record<BadgeTone, string> = {
  neutral: 'border-input text-muted-foreground',
  accent: 'border-foreground text-foreground',
  success: 'border-success/60 text-success',
  warning: 'border-warning/60 text-warning',
  danger: 'border-destructive/60 text-destructive',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center whitespace-nowrap rounded-sm border px-1.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
