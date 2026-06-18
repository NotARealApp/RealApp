"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// `srLabel` overrides the accessible name when `label` is an icon (e.g. the
// direction house/building icons), so screen readers still announce "To Work".
type Opt<T extends string> = { value: T; label: ReactNode; srLabel?: string };

// Compact N-state switch with an animated sliding thumb. Used for the direction
// (Office/Home), day (Today/Tomorrow) and plan-mode (Now/Leave/Arrive) toggles
// so they all share one style. `fullWidth` stretches it to its container.
export function SlideToggle<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  fullWidth,
}: {
  value: T;
  options: Opt<T>[];
  onChange: (v: T) => void;
  ariaLabel: string;
  fullWidth?: boolean;
}) {
  const n = options.length;
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "relative grid select-none rounded-full border border-outline bg-surface-container p-1 text-xs font-semibold",
        fullWidth ? "w-full" : "shrink-0",
      )}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-1 left-1 rounded-full bg-primary-container shadow-sm transition-transform duration-200 ease-out"
        style={{ width: `calc(${100 / n}% - 0.25rem)`, transform: `translateX(${idx * 100}%)` }}
      />
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          aria-label={opt.srLabel}
          onClick={() => onChange(opt.value)}
          className={cn(
            "relative z-10 inline-flex items-center justify-center rounded-full px-3 py-1.5 transition-colors",
            value === opt.value ? "text-on-primary-container" : "text-on-surface-variant",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
