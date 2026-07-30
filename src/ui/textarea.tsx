import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "border-border bg-bg-elevated text-text focus:border-accent focus:ring-accent/30 placeholder:text-text-faint w-full rounded-md border px-3 py-2 text-sm shadow-sm transition focus:ring-2 focus:outline-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
