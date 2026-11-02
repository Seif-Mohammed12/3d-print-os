import { cn } from '../lib/utils';

/**
 * Where something stands on its way through a fixed set of stages. `index` is the stage
 * reached (-1 with state `cancelled`); `label` names it for screen readers.
 */
export type StageLineState = {
  index: number;
  state: 'moving' | 'waiting' | 'failed' | 'cancelled' | 'finished';
  label: string;
};

/**
 * The stage line: one dot per stage joined by a line. Passed stages are filled, the current
 * one is ringed (red when it failed, amber while it waits), later ones hollow. `labels`
 * writes the stage names under the dots; without it the line stays compact for rows.
 */
export function StageLine({
  stages,
  stage,
  labels = false,
  className,
}: {
  stages: readonly string[];
  stage: StageLineState;
  labels?: boolean;
  className?: string;
}) {
  const cancelled = stage.state === 'cancelled';
  const reached = Math.max(0, stage.index);
  const tone =
    stage.state === 'failed'
      ? 'bg-stock-failed'
      : stage.state === 'waiting'
        ? 'bg-stock-quoted'
        : 'bg-brand';
  const ring =
    stage.state === 'failed'
      ? 'ring-stock-failed/25'
      : stage.state === 'waiting'
        ? 'ring-stock-quoted/30'
        : 'ring-brand/20';

  return (
    <div
      role="img"
      aria-label={
        cancelled ? 'Cancelled' : `${stage.label}, stage ${reached + 1} of ${stages.length}`
      }
      className={cn('grid min-w-0', className)}
      style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}
    >
      <div className="relative col-span-full h-3">
        {/* The track runs from the first dot's centre to the last one's. */}
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-border"
          style={{ insetInline: `calc(100% / ${stages.length * 2})` }}
        />
        {!cancelled && reached > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1/2 h-0.5 -translate-y-1/2"
            style={{
              insetInlineStart: `calc(100% / ${stages.length * 2})`,
              width: `calc((100% - 100% / ${stages.length}) * ${reached / (stages.length - 1)})`,
            }}
          >
            {/* Keyed by stage so an advance replays the fill. */}
            <span
              key={stage.index}
              className="stage-fill block h-full w-full rounded-full bg-brand"
            />
          </span>
        )}
        {stages.map((name, index) => {
          const passed = !cancelled && index < reached;
          const current = !cancelled && index === reached;
          return (
            <span
              key={name}
              aria-hidden="true"
              className={cn(
                'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full rtl:translate-x-1/2',
                current
                  ? cn('h-3 w-3 ring-4', tone, ring)
                  : passed
                    ? 'h-2 w-2 bg-brand'
                    : 'h-2 w-2 border-[1.5px] border-input bg-card',
              )}
              style={{
                insetInlineStart: `calc(100% * ${(index * 2 + 1) / (stages.length * 2)})`,
              }}
            />
          );
        })}
      </div>
      {labels &&
        stages.map((name, index) => (
          <span
            key={name}
            className={cn(
              'mt-2 truncate px-0.5 text-center text-[11px] leading-4',
              !cancelled && index === reached
                ? stage.state === 'failed'
                  ? 'font-semibold text-destructive'
                  : 'font-semibold text-foreground'
                : 'text-muted-foreground',
            )}
          >
            {!cancelled && index === reached && stage.state === 'failed' ? 'Failed' : name}
          </span>
        ))}
    </div>
  );
}
