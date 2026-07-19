import { Skeleton } from './skeleton';

export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-8 w-8" />
      </div>
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  );
}
