import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "tonal" | "soft";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary shadow-elev-1 hover:shadow-elev-2",
  ghost: "border border-outline bg-transparent text-on-surface hover:bg-surface-high",
  tonal: "bg-secondary-container text-on-secondary-container",
  soft: "border border-primary/40 bg-transparent text-primary hover:bg-primary/10",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  fullWidth?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", fullWidth, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full px-5 text-sm font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
