/**
 * Minimal className joiner. Deliberately dependency-free — Roster's UI kit is
 * hand-rolled Tailwind, so we don't pull in clsx/tailwind-merge.
 */
export type ClassValue = string | false | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
