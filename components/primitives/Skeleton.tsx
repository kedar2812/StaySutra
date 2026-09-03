import { cn } from "@/lib/utils";

/**
 * Skeletons reserve the exact final dimensions so arrival costs no layout shift.
 * A centred spinner is not an acceptable substitute. DPR §6.4
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-chip bg-ink-700", className)}
      aria-hidden
    />
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="aspect-[4/3] w-full rounded-card" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-6 w-24 rounded-chip" />
        <Skeleton className="h-6 w-20 rounded-chip" />
      </div>
    </div>
  );
}

export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
}
