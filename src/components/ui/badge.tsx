import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "mt-1 inline-block rounded-full bg-status-warn/20 px-2.5 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wider text-status-warn",
        className,
      )}
      {...props}
    />
  );
}
