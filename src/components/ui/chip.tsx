import { cn } from "@/lib/cn";

type ChipProps = {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
};

export function Chip({ active, onClick, children, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-10 cursor-pointer rounded-sm border px-3.5 py-2 text-left text-sm font-medium transition",
        active
          ? "border-primary bg-primary-container text-on-primary-container"
          : "border-outline bg-surface-high text-on-surface hover:bg-surface-highest",
        className,
      )}
    >
      {children}
    </button>
  );
}
