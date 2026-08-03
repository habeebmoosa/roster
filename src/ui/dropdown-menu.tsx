"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdownContext(): DropdownContextValue {
  const ctx = useContext(DropdownContext);
  if (!ctx) throw new Error("DropdownMenu.* components must be used within <DropdownMenu>");
  return ctx;
}

export function DropdownMenu({ children, className }: { children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div ref={rootRef} className={cn("relative inline-block", className)}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = useDropdownContext();
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  className,
  align = "start",
  side = "bottom",
}: {
  children: ReactNode;
  className?: string;
  align?: "start" | "end";
  /** Which side of the trigger the panel opens toward. */
  side?: "top" | "bottom";
}) {
  const { open } = useDropdownContext();
  if (!open) return null;
  return (
    <div
      role="menu"
      className={cn(
        "border-border bg-bg-elevated absolute z-50 min-w-40 rounded-lg border p-1 shadow-md",
        side === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
        align === "end" ? "right-0" : "left-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Shared visual style for a menu row. Exported so a one-off item that can't
 * use DropdownMenuItem directly (e.g. a `<form>`-submitted sign-out button)
 * still looks identical rather than duplicating the class string.
 */
export const dropdownMenuItemClasses =
  "text-text hover:bg-bg-subtle flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:text-text-faint disabled:hover:bg-transparent";

export function DropdownMenuItem({
  children,
  onSelect,
  className,
  ...props
}: { onSelect?: () => void } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = useDropdownContext();
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        onSelect?.();
        setOpen(false);
      }}
      className={cn(dropdownMenuItemClasses, className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("bg-border my-1 h-px", className)} {...props} />;
}
