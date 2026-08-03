import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Drops the default border/shadow/focus-ring entirely instead of trying to
   * cancel them via `className` — conflicting utility classes (e.g.
   * `focus:ring-0` vs. the default `focus:ring-2`) aren't guaranteed to win
   * based on source order in Tailwind v4, so a real variant is the reliable
   * way to opt out. For a textarea embedded in its own bordered container
   * (e.g. the chat composer) that owns the focus affordance itself.
   */
  unstyled?: boolean;
}

export function Textarea({ className, unstyled, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        unstyled
          ? "text-text placeholder:text-text-faint w-full resize-none bg-transparent text-sm outline-none"
          : "border-border bg-bg-elevated text-text focus:border-accent focus:ring-accent/30 placeholder:text-text-faint w-full rounded-md border px-3 py-2 text-sm shadow-sm transition focus:ring-2 focus:outline-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
