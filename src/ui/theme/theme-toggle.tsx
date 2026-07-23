"use client";

import { cn } from "@/lib/cn";
import { useTheme } from "./theme-provider";

/** Pill-style switch used in the profile menu and Settings → Appearance. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      className={cn(
        "border-border relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
        isDark ? "bg-accent" : "bg-bg-subtle",
        className,
      )}
    >
      <span
        className={cn(
          "bg-bg-elevated inline-block h-4 w-4 transform rounded-full shadow-sm transition-transform",
          isDark ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}
