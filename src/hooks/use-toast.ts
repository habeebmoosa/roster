"use client";

import { useEffect, useState } from "react";

export type ToastVariant = "default" | "success" | "danger";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener(toasts);
}

const DEFAULT_DURATION_MS = 4000;

/** Fire-and-forget toast — no provider/wrapper needed, just mount <Toaster/> once. */
export function toast(input: Omit<ToastItem, "id">, durationMs = DEFAULT_DURATION_MS): string {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, ...input }];
  emit();
  if (durationMs > 0) {
    setTimeout(() => dismissToast(id), durationMs);
  }
  return id;
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToasts(): ToastItem[] {
  const [state, setState] = useState<ToastItem[]>(toasts);
  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);
  return state;
}
