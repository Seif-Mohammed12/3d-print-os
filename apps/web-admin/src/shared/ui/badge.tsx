import type { ReactNode } from 'react';

import { cn } from '../lib/utils';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

// Flags and attributes (Business, Active, Default). Statuses use StockTag instead.
const tones: Record<BadgeTone, string> = {
  neutral: 'border-border bg-muted/60 text-muted-foreground',
  accent: 'border-brand/30 bg-transparent text-primary dark:text-brand',
  success: 'border-success/25 bg-success-soft text-success',
  warning: 'border-warning/25 bg-warning-soft text-warning',
  danger: 'border-destructive/25 bg-destructive-soft text-destructive',
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
        'inline-flex h-6 items-center whitespace-nowrap rounded-md border px-2 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
