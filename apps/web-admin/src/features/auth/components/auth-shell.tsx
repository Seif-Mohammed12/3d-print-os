import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';

const points = {
  staff: [
    'Instant, slicer-accurate quotes',
    'Track every order from quote to delivery',
    'See your printers and queue at a glance',
  ],
  customer: [
    'Upload a model and get a price in seconds',
    'Choose material, color and quality',
    'Follow your order until it ships',
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
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground/15 text-sm font-semibold">
            3D
          </span>
          <span className="font-semibold">Print OS</span>
        </div>
        <div>
          <p className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
            {audience === 'staff'
              ? 'Run your print shop from one place.'
              : 'Real parts, priced in seconds.'}
          </p>
          <ul className="mt-8 space-y-3">
            {points[audience].map((point) => (
              <li key={point} className="flex items-center gap-3 text-primary-foreground/85">
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-primary-foreground/70">Made for 3D printing businesses.</p>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              3D
            </span>
            <span className="font-semibold text-foreground">Print OS</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
        </div>
      </div>
    </div>
  );
}
