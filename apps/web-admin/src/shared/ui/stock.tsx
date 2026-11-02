import type { ReactNode } from 'react';

import { cn } from '../lib/utils';

/**
 * Status colours: the one vocabulary for where a job stands. Each status has a solid dot, a
 * soft chip ground and a chip ink, and keeps them on every screen, so a colour always means
 * exactly one thing.
 */
export type Stock =
  'draft' | 'quoted' | 'approved' | 'printing' | 'qc' | 'failed' | 'void' | 'done';

export const STOCK_DOT: Record<Stock, string> = {
  draft: 'bg-stock-draft',
  quoted: 'bg-stock-quoted',
  approved: 'bg-stock-approved',
  printing: 'bg-stock-printing',
  qc: 'bg-stock-qc',
  failed: 'bg-stock-failed',
  void: 'bg-stock-void',
  done: 'bg-stock-done',
};

export const STOCK_CHIP: Record<Stock, string> = {
  draft: 'bg-stock-draft-soft text-stock-draft-ink',
  quoted: 'bg-stock-quoted-soft text-stock-quoted-ink',
  approved: 'bg-stock-approved-soft text-stock-approved-ink',
  printing: 'bg-stock-printing-soft text-stock-printing-ink',
  qc: 'bg-stock-qc-soft text-stock-qc-ink',
  failed: 'bg-stock-failed-soft text-stock-failed-ink',
  void: 'bg-stock-void-soft text-stock-void-ink',
  done: 'bg-stock-done-soft text-stock-done-ink',
};

/** A status chip: soft pill, a dot in the status colour, and the status word. */
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
        'inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold',
        STOCK_CHIP[stock],
        stock === 'void' && 'line-through decoration-1',
        className,
      )}
    >
      <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', STOCK_DOT[stock])} />
      {children}
    </span>
  );
}

/** The status dot that leads a table row or list item. */
export function StockSwatch({ stock, className }: { stock: Stock; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full', STOCK_DOT[stock], className)}
    />
  );
}

/**
 * A job card: status chip and an aside (order number, time) over the card's content.
 * `emphasis` marks a card that needs a hand (a failed print).
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
    <div
      className={cn(
        'rounded-xl border bg-card p-3 text-card-foreground shadow-card dark:shadow-none',
        emphasis ? 'border-stock-failed/60 ring-1 ring-stock-failed/30' : 'border-border',
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        {/* The status word never truncates; the aside gives way. */}
        <StockTag stock={stock} className="shrink-0">
          {head}
        </StockTag>
        {aside && (
          <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
            {aside}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/** Status lamp for machines: a dot plus its word, never colour alone. */
export type LampTone = 'running' | 'ready' | 'waiting' | 'fault' | 'off';

const LAMP: Record<LampTone, string> = {
  running: 'bg-stock-printing',
  ready: 'bg-stock-done',
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
        'inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium',
        tone === 'fault' ? 'text-destructive' : 'text-muted-foreground',
        className,
      )}
    >
      <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', LAMP[tone])} />
      {children}
    </span>
  );
}
