/** A short, human-friendly label for a token count, e.g. "842", "12.3K", "1.2M". */
export function formatTokenCount(count: number): string {
  if (count < 1000) return count.toLocaleString();
  if (count < 1_000_000) return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}
