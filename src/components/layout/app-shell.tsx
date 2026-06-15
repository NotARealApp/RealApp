import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function AppShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto max-w-[480px] px-4 py-4 md:max-w-[640px] lg:max-w-[720px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
