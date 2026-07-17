import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "focus:border-brand focus:ring-brand/30 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition placeholder:text-neutral-400 focus:ring-2 focus:outline-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
