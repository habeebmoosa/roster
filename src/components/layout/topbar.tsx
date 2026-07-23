import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Per-page header. Each screen renders its own title/actions here (the
 * design's screens each have distinct top content, not one uniform bar) —
 * this is the shared, reusable shell for that pattern.
 */
export function Topbar({
  title,
  actions,
  className,
}: {
  title: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 px-6 py-5", className)}>
      <h1 className="text-text truncate text-xl font-bold tracking-tight">{title}</h1>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
