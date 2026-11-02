import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '../lib/utils';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold leading-tight tracking-[-0.01em] text-foreground">
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A row of figures ruled under a 2px ink line, like the header strip of a planning board. */
export function StatStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        // gap-px over a border-coloured ground draws the hairlines between cells at any column count
        'grid grid-cols-2 gap-px border-b border-t-2 border-b-border border-t-rule bg-border xl:grid-cols-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  hintTone = 'muted',
  aside,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  hintTone?: 'muted' | 'success' | 'warning' | 'danger';
  aside?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-3 gap-y-2 bg-background px-4 py-3">
      <div className="min-w-0">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <p className="tabular mt-0.5 text-[22px] font-semibold leading-tight tracking-[-0.01em] text-foreground sm:text-[26px]">
          {value}
        </p>
        {hint && (
          <p
            className={cn(
              'mt-0.5 text-xs',
              hintTone === 'muted' && 'text-muted-foreground',
              hintTone === 'success' && 'font-semibold text-success',
              hintTone === 'warning' && 'font-semibold text-warning',
              hintTone === 'danger' && 'font-semibold text-destructive',
            )}
          >
            {hint}
          </p>
        )}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}

/** An empty rack slot: dashed outline, says what belongs here and how to put it there. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'm-4 flex flex-col items-center rounded-sm border border-dashed border-input px-6 py-10 text-center',
        className,
      )}
    >
      {Icon && <Icon className="mb-3 h-6 w-6 text-muted-foreground" aria-hidden="true" />}
      <p className="text-[15px] font-bold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-sm bg-muted', className)} />;
}

/** Inline error strip for failed queries, headed like a failed card, with an optional retry. */
export function ErrorNotice({
  message,
  onRetry,
  className,
}: {
  message: ReactNode;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-stretch overflow-hidden rounded-sm border border-destructive bg-destructive-soft text-sm text-foreground',
        className,
      )}
    >
      <span className="flex items-center bg-stock-failed px-2.5 text-[11px] font-bold tracking-[0.02em] text-white">
        ERROR
      </span>
      <span className="flex-1 px-3 py-2.5">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3 font-semibold underline underline-offset-[3px] hover:bg-destructive/10"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** Label/value rows used in detail panels. */
export function DetailList({ items }: { items: Array<{ label: ReactNode; value: ReactNode }> }) {
  return (
    <dl className="divide-y divide-border text-sm">
      {items.map((item, index) => (
        <div key={index} className="flex items-center justify-between gap-4 py-2">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="tabular text-end font-semibold text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
