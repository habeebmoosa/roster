/**
 * Theme is persisted server-side via a plain (non-sensitive) cookie so the
 * root layout can render the correct `data-theme` on the very first response
 * — no flash-of-wrong-theme, no blocking inline script needed.
 */
export const THEME_COOKIE = "roster-theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export type Theme = "light" | "dark";

/** Pure, testable parser. Anything but exactly "dark" resolves to "light". */
export function parseTheme(value: string | undefined | null): Theme {
  return value === "dark" ? "dark" : "light";
}
