import { cn } from '../../lib/utils';

/** The product mark: a teal tile with a stage line, three stops, the last one reached. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('h-6 w-6 shrink-0', className)}>
      <rect width="24" height="24" rx="7" fill="hsl(var(--brand))" />
      <path
        d="M6 12h12"
        stroke="white"
        strokeOpacity="0.55"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="6" cy="12" r="2" fill="white" fillOpacity="0.75" />
      <circle cx="12" cy="12" r="2" fill="white" fillOpacity="0.75" />
      <circle cx="18" cy="12" r="3" fill="white" />
    </svg>
  );
}

export function BrandName({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex items-center gap-2.5 whitespace-nowrap text-[15px] font-bold tracking-[-0.01em]',
        className,
      )}
    >
      <BrandMark />
      3D Print OS
    </span>
  );
}
