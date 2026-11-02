import type { ReactNode } from 'react';

import { BrandName } from '../../../shared/components/brand/brand-mark';
import { cn } from '../../../shared/lib/utils';

const points: Record<'staff' | 'customer', Array<{ head: string; text: string }>> = {
  staff: [
    { head: 'Quote', text: 'Prices from a real slice of the model' },
    { head: 'Print', text: 'Every printer and its queue at a glance' },
    { head: 'Deliver', text: 'Each order tracked from quote to pickup' },
  ],
  customer: [
    { head: 'Upload', text: 'Send a model and get a price in seconds' },
    { head: 'Choose', text: 'Pick the material, colour and quality' },
    { head: 'Follow', text: 'See your order until it is ready' },
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
      <div className="hidden flex-col justify-between border-e border-border bg-sidebar-active p-12 lg:flex">
        <BrandName className="text-foreground" />
        <div>
          <p className="max-w-md text-[34px] font-bold leading-[1.12] tracking-[-0.02em] text-foreground">
            {audience === 'staff'
              ? 'Run your print shop from one place.'
              : 'Real parts, priced from a real slice.'}
          </p>
          {/* The three steps as a stage line, the last one reached. */}
          <ol className="mt-10 max-w-md">
            {points[audience].map((point, index, all) => {
              const last = index === all.length - 1;
              return (
                <li key={point.head} className="relative flex gap-4 pb-6 last:pb-0">
                  {!last && (
                    <span
                      aria-hidden="true"
                      className="absolute start-[7px] top-5 h-[calc(100%-12px)] w-0.5 rounded-full bg-brand/40"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'relative mt-1 h-4 w-4 shrink-0 rounded-full',
                      last ? 'bg-brand ring-4 ring-brand/20' : 'border-2 border-brand bg-card',
                    )}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">
                      {point.head}
                    </span>
                    <span className="block text-sm text-muted-foreground">{point.text}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        <p className="text-sm text-muted-foreground">Made for 3D printing businesses.</p>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <BrandName className="text-foreground" />
          </div>
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-foreground">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
        </div>
      </div>
    </div>
  );
}
