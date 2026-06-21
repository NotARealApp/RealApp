import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the day-planner layout (weather → toggles → time → leave hero →
// outfit → routes) so the swap to real content lands without a layout jump.
export function DayPlannerSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      {/* Weather strip */}
      <Skeleton className="mb-4 h-16 rounded-xl" />

      {/* Direction + day toggles */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <Skeleton className="h-10 w-32 rounded-full" />
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>

      {/* Plan-time picker */}
      <Skeleton className="mb-3 h-12 rounded-xl" />

      {/* Leave-by hero card */}
      <Skeleton className="mb-3 h-40 rounded-[28px]" />

      {/* Outfit card */}
      <div className="mb-3 rounded-xl border border-outline bg-surface-container px-5 py-4">
        <Skeleton className="mb-3 h-4 w-28" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Routes list */}
      <div className="rounded-xl border border-outline bg-surface-container px-5 py-4">
        <Skeleton className="mb-3 h-4 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
