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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  hintTone = 'muted',
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  hintTone?: 'muted' | 'success' | 'warning' | 'danger';
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="tabular mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {hint && (
        <p
          className={cn(
            'mt-1 text-xs',
            hintTone === 'muted' && 'text-muted-foreground',
            hintTone === 'success' && 'text-success',
            hintTone === 'warning' && 'text-warning',
            hintTone === 'danger' && 'text-destructive',
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

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
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

/** Inline error block for failed queries, with an optional retry. */
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
        'flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive-soft px-4 py-3 text-sm text-destructive',
        className,
      )}
    >
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="font-medium underline-offset-2 hover:underline"
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
          <dd className="tabular text-end font-medium text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
