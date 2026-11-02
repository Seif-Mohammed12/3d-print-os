import type { ReactNode } from 'react';

import { cn } from '../lib/utils';

/**
 * Card stock: the one colour vocabulary for status. A job keeps the same stock in the rack, in
 * tables and on detail pages, so a colour always means exactly one thing.
 */
export type Stock =
  'draft' | 'quoted' | 'approved' | 'printing' | 'qc' | 'failed' | 'void' | 'done';

export const STOCK_FILL: Record<Stock, string> = {
  draft: 'bg-stock-draft text-stock-ink',
  quoted: 'bg-stock-quoted text-stock-ink',
  approved: 'bg-stock-approved text-stock-ink',
  printing: 'bg-stock-printing text-stock-ink',
  qc: 'bg-stock-qc text-stock-ink',
  failed: 'bg-stock-failed text-white',
  void: 'bg-stock-void text-stock-ink',
  done: 'bg-stock-done text-stock-done-ink',
};

/** A status tag drawn as a T-card's coloured head. */
export function StockTag({
  stock,
  children,
  className,
}: {
  stock: Stock;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center whitespace-nowrap rounded-sm border border-stock-edge px-2 text-xs font-semibold',
        STOCK_FILL[stock],
        stock === 'void' && 'line-through decoration-1',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** The small square of stock that leads a table row or list item. */
export function StockSwatch({ stock, className }: { stock: Stock; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block h-3 w-3 shrink-0 rounded-sm border border-stock-edge',
        STOCK_FILL[stock],
        className,
      )}
    />
  );
}

/**
 * A T-card: coloured head over an inset paper body, the way cards hang in a planning rack.
 * `head` is the status line; `aside` sits at the head's far end (time left, order number).
 */
export function TCard({
  stock,
  head,
  aside,
  children,
  className,
  emphasis,
}: {
  stock: Stock;
  head: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  emphasis?: boolean;
}) {
  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'relative z-[1] flex h-[22px] items-center justify-between gap-2 border border-stock-edge px-2 text-[11px] font-bold tracking-[0.02em]',
          STOCK_FILL[stock],
        )}
      >
        {/* The status word is the card's content: it never truncates, the aside gives way. */}
        <span className="shrink-0 whitespace-nowrap">{head}</span>
        {aside && <span className="min-w-0 truncate font-semibold">{aside}</span>}
      </div>
      <div
        className={cn(
          'mx-1.5 -mt-px border border-t-0 border-stock-edge bg-card px-2 pb-2 pt-1.5 text-card-foreground',
          emphasis && 'border-x-2 border-b-2 border-stock-failed',
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Status lamp for machines: a lit dot plus its word, never colour alone. */
export type LampTone = 'running' | 'ready' | 'waiting' | 'fault' | 'off';

const LAMP: Record<LampTone, string> = {
  running: 'bg-stock-printing',
  ready: 'bg-stock-approved',
  waiting: 'bg-stock-quoted',
  fault: 'bg-stock-failed',
  off: 'bg-stock-void',
};

export function Lamp({
  tone,
  children,
  className,
}: {
  tone: LampTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold',
        tone === 'fault' ? 'text-destructive' : 'text-foreground',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('h-2 w-2 rounded-full ring-1 ring-stock-edge', LAMP[tone])}
      />
      {children}
    </span>
  );
}
