import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Size = "sm" | "xs";

const sizeClasses: Record<Size, string> = {
  sm: "text-sm",
  xs: "text-xs",
};

export interface ErrorBannerProps {
  children: ReactNode;
  size?: Size;
  className?: string;
}

/** A single, consistent style for a surfaced error — announced via role="alert". */
export function ErrorBanner({ children, size = "sm", className }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        "border-danger/30 bg-danger-soft text-danger rounded-lg border px-3 py-2",
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </div>
  );
}
