import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface SwitchProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange" | "type"
> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** Controlled pill toggle. The canonical on/off control — ThemeToggle wraps this. */
export function Switch({ checked, onCheckedChange, className, disabled, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "border-border relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-accent" : "bg-bg-subtle",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "bg-bg-elevated inline-block h-4 w-4 transform rounded-full shadow-sm transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}
