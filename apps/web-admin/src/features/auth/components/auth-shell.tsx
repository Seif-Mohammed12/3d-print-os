import type { ReactNode } from 'react';

import { BrandName } from '../../../shared/components/brand/brand-mark';
import { STOCK_FILL, type Stock } from '../../../shared/ui/stock';
import { cn } from '../../../shared/lib/utils';

const points: Record<'staff' | 'customer', Array<{ stock: Stock; head: string; text: string }>> = {
  staff: [
    { stock: 'quoted', head: 'QUOTE', text: 'Prices from a real slice of the model' },
    { stock: 'printing', head: 'PRINT', text: 'Every printer and its queue at a glance' },
    { stock: 'approved', head: 'DELIVER', text: 'Each order tracked from quote to pickup' },
  ],
  customer: [
    { stock: 'quoted', head: 'UPLOAD', text: 'Send a model and get a price in seconds' },
    { stock: 'approved', head: 'CHOOSE', text: 'Pick the material, colour and quality' },
    { stock: 'printing', head: 'FOLLOW', text: 'See your order until it is ready' },
  ],
};

export function AuthShell({
  audience,
  title,
  subtitle,
  children,
  footer,
}: {
  audience: 'staff' | 'customer';
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <BrandName className="text-white dark:text-sidebar-foreground" />
        <div>
          <p className="max-w-md text-[32px] font-bold leading-[1.15] tracking-[-0.01em] text-white dark:text-sidebar-foreground">
            {audience === 'staff'
              ? 'Run your print shop from one board.'
              : 'Real parts, priced from a real slice.'}
          </p>
          <ul className="mt-10 grid max-w-md gap-3">
            {points[audience].map((point) => (
              <li key={point.head}>
                <div
                  className={cn(
                    'flex h-[22px] items-center border border-stock-edge px-2 text-[11px] font-bold tracking-[0.02em]',
                    STOCK_FILL[point.stock],
                  )}
                >
                  {point.head}
                </div>
                <p className="mx-1.5 border border-t-0 border-stock-edge bg-stock-draft px-3 py-2.5 text-sm font-medium text-stock-ink">
                  {point.text}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-sidebar-muted">Made for 3D printing businesses.</p>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <BrandName className="text-foreground" />
          </div>
          <h1 className="text-[26px] font-bold leading-tight tracking-[-0.01em] text-foreground">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8 border-t-2 border-rule pt-6">{children}</div>
          <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
        </div>
      </div>
    </div>
  );
}
