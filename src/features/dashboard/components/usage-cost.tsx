import { Card, CardTitle, EmptyState } from "@/ui";
import type { UsageEntry } from "../types";

export function UsageCost({ entries }: { entries: UsageEntry[] }) {
  const maxSpend = Math.max(1, ...entries.map((e) => e.spendUsd));

  return (
    <Card>
      <CardTitle>Usage &amp; cost</CardTitle>

      {entries.length === 0 ? (
        <EmptyState className="mt-4 border-none p-6" title="Nothing to show yet" />
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {entries.map((entry) => (
            <li key={entry.name} className="flex items-center gap-3">
              <span className="text-text w-32 shrink-0 truncate text-sm">{entry.name}</span>
              <span className="bg-bg-subtle h-2 flex-1 overflow-hidden rounded-full">
                <span
                  className="bg-accent block h-full rounded-full"
                  style={{ width: `${(entry.spendUsd / maxSpend) * 100}%` }}
                />
              </span>
              <span className="text-text-muted w-14 shrink-0 text-right text-sm">
                ${entry.spendUsd.toFixed(0)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
