import { cn } from "@/lib/cn";

export function leaveTierClass(tier: string) {
  if (tier === "urgent") return "text-status-bad";
  if (tier === "soon") return "text-status-warn";
  return "text-status-good";
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  ariaLabel: string;
}) {
  return (
    <div className="mb-3 flex rounded-xl border border-outline bg-surface-container p-1" role="group" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
            value === opt.value
              ? "bg-primary-container text-on-primary-container shadow-sm"
              : "text-on-surface-variant hover:text-on-surface",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
