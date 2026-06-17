"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// `srLabel` overrides the accessible name when `label` is an icon (e.g. the
// direction house/building icons), so screen readers still announce "To Work".
type Opt<T extends string> = { value: T; label: ReactNode; srLabel?: string };

// Compact two-state switch with an animated sliding thumb. Used for both the
// direction (Office/Home) and day (Today/Tomorrow) toggles so they match.
export function SlideToggle<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: [Opt<T>, Opt<T>];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  const secondActive = value === options[1].value;
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="relative grid shrink-0 select-none grid-cols-2 rounded-full border border-outline bg-surface-container p-1 text-xs font-semibold"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-primary-container shadow-sm transition-transform duration-200"
        style={{ transform: secondActive ? "translateX(100%)" : "translateX(0)" }}
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
