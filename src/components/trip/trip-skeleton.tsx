import { Skeleton } from "@/components/ui/skeleton";

export function TripSkeleton() {
  return (
    <div>
      <Skeleton className="mb-3.5 h-[150px]" />
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[150px]" />
        ))}
      </div>
    </div>
  );
}
