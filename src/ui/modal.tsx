"use client";

import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ModalSize = "md" | "panel";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  /**
   * "md" (default) is the standard centered form dialog. "panel" is a large,
   * near-fullscreen scrollable surface for rich detail views (e.g. a
   * connector's full detail page) — its own header/body layout, no padding.
   */
  size?: ModalSize;
}

const sizeClasses: Record<ModalSize, string> = {
  md: "w-full max-w-md p-6",
  panel: "flex h-[88vh] max-h-[920px] w-[92vw] max-w-4xl flex-col overflow-hidden p-0",
};

/** Centered dialog built on the native <dialog> element (built-in focus trap + Escape). */
export function Modal({ open, onClose, title, children, className, size = "md" }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function onBackdropClick(e: MouseEvent<HTMLDialogElement>) {
    const dialog = ref.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    if (!inside) onClose();
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      onClick={onBackdropClick}
      className={cn(
        "border-border bg-bg-elevated text-text backdrop:bg-overlay m-auto rounded-2xl border shadow-md",
        sizeClasses[size],
        className,
      )}
    >
      {title ? <h2 className="text-text mb-4 text-lg font-semibold">{title}</h2> : null}
      {children}
    </dialog>
  );
}
