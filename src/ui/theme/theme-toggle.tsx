"use client";

import { Switch } from "@/ui/switch";
import { useTheme } from "./theme-provider";

/** Used in the profile menu and Settings → Appearance. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Switch
      checked={isDark}
      onCheckedChange={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={className}
    />
  );
}
