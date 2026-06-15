import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-gradient-to-r from-surface-high via-outline to-surface-high bg-[length:480px_100%] animate-shimmer",
        className,
      )}
    />
  );
}
