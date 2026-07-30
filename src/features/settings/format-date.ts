/** Short absolute date for API key rows, e.g. "Jun 1, 2026". */
export function formatApiKeyDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
