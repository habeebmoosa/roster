import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { IconChevronDown } from "./icons";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          "border-border bg-bg-elevated text-text focus:border-accent focus:ring-accent/30 w-full appearance-none rounded-md border px-3 py-2 pr-9 text-sm shadow-sm transition focus:ring-2 focus:outline-none disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <IconChevronDown
        aria-hidden
        className="text-text-faint pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2"
      />
    </div>
  );
}
