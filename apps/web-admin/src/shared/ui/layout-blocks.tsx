import type { ReactNode } from 'react';
import { AlertCircle, type LucideIcon } from 'lucide-react';

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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-foreground">
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A row of figure cards. */
export function StatStrip({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-3 xl:grid-cols-4', className)}>{children}</div>;
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
    <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-3 gap-y-2 rounded-xl border border-border bg-card px-4 py-4 shadow-card dark:shadow-none sm:px-5">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <p className="tabular mt-1.5 text-[22px] font-bold leading-tight tracking-[-0.02em] text-foreground sm:text-[28px]">
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

/** An empty state: says what belongs here and how to put it there. */
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
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      {Icon && (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-stock-printing-soft text-stock-printing-ink">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <p className="text-[15px] font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-muted', className)} />;
}

/** Inline error notice for failed queries, with an optional retry. */
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
        'flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive-soft px-4 py-3 text-sm text-foreground',
        className,
      )}
    >
      <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg px-2 py-1 font-semibold text-destructive hover:bg-destructive/10"
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
