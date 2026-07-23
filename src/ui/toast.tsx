"use client";

import { dismissToast, useToasts, type ToastVariant } from "@/hooks/use-toast";
import { cn } from "@/lib/cn";

const variantClasses: Record<ToastVariant, string> = {
  default: "border-border bg-bg-elevated text-text",
  success: "border-success/30 bg-success-soft text-success",
  danger: "border-danger/30 bg-danger-soft text-danger",
};

/** Mount once (root layout). Renders whatever toast()/dismissToast() produce. */
export function Toaster() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto rounded-lg border p-4 shadow-md",
            variantClasses[t.variant ?? "default"],
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description ? <p className="mt-1 text-sm opacity-90">{t.description}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss"
              className="opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
