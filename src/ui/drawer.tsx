"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Side panel (e.g. chat History). Always mounted — visibility is purely CSS
 * (translate-x + opacity) so both the enter and exit transitions animate.
 */
export function Drawer({ open, onClose, title, children, className }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div
      className={cn("fixed inset-0 z-50", open ? "" : "pointer-events-none")}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={cn(
          "bg-overlay absolute inset-0 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "border-border bg-bg-elevated absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l shadow-md transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
          className,
        )}
      >
        {title ? (
          <div className="border-border flex items-center justify-between border-b p-4">
            <h2 className="text-text text-base font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-text-faint hover:text-text"
            >
              ✕
            </button>
          </div>
        ) : null}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
