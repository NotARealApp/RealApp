import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const styles =
  "inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-high text-on-surface transition hover:bg-surface-highest active:scale-[0.92]";

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button ref={ref} className={cn(styles, className)} {...props} />
  ),
);
IconButton.displayName = "IconButton";

export function IconLink({
  href,
  className,
  children,
  ...props
}: { href: string; className?: string; children: ReactNode } & Omit<
  React.ComponentProps<typeof Link>,
  "href" | "className" | "children"
>) {
  return (
    <Link href={href} className={cn(styles, className)} {...props}>
      {children}
    </Link>
  );
}
