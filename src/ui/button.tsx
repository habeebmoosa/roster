import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-contrast hover:opacity-90 focus-visible:ring-accent/50",
  secondary:
    "border border-border bg-bg-elevated text-text hover:bg-bg-subtle focus-visible:ring-border",
  danger:
    "border border-danger/30 bg-bg-elevated text-danger hover:bg-danger-soft focus-visible:ring-danger/50",
};

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
