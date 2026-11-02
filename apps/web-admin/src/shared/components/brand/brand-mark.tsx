import { cn } from '../../lib/utils';

/** The product mark: a single T-card, yellow head over a paper body. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 22" aria-hidden="true" className={cn('h-[22px] w-5 shrink-0', className)}>
      <rect
        x="0.5"
        y="0.5"
        width="19"
        height="7"
        fill="hsl(var(--stock-quoted))"
        stroke="hsl(var(--stock-edge))"
      />
      <rect
        x="3.5"
        y="7.5"
        width="13"
        height="14"
        fill="hsl(var(--stock-draft))"
        stroke="hsl(var(--stock-edge))"
      />
    </svg>
  );
}

export function BrandName({ className }: { className?: string }) {
  return (
    <span
      className={cn('flex items-center gap-2.5 whitespace-nowrap text-[15px] font-bold', className)}
    >
      <BrandMark />
      3D Print OS
    </span>
  );
}
