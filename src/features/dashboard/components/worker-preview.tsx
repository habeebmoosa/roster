import Link from "next/link";
import { agentStatusBadge, type WorkerRow } from "@/features/workers";
import { Avatar, Badge, Card, CardTitle, EmptyState } from "@/ui";

export function WorkerPreview({ rows }: { rows: WorkerRow[] }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Your workers</CardTitle>
        {rows.length > 0 ? (
          <Link href="/workers" className="text-accent text-sm font-medium hover:underline">
            View all →
          </Link>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          className="mt-4 border-none p-6"
          title="No employees yet"
          description="Hire your first AI employee to see it here."
        />
      ) : (
        <ul className="divide-border mt-4 divide-y">
          {rows.map((row) => {
            const badge = agentStatusBadge(row.status);
            return (
              <li key={row.id} className="flex items-center gap-3 py-3">
                <Avatar name={row.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-text truncate text-sm font-semibold">{row.name}</p>
                  <p className="text-text-muted truncate text-xs">{row.role}</p>
                </div>
                <Badge variant={badge.variant} className="shrink-0">
                  {badge.label}
                </Badge>
                <span
                  className={
                    row.model
                      ? "text-text-muted hidden w-32 shrink-0 truncate text-xs sm:inline"
                      : "text-text-faint hidden w-32 shrink-0 truncate text-xs italic sm:inline"
                  }
                >
                  {row.model ?? "Not configured"}
                </span>
                <span className="text-text-faint hidden w-20 shrink-0 text-xs md:inline">
                  {row.lastActivity ?? "—"}
                </span>
                <span className="text-text w-16 shrink-0 text-right text-sm font-medium">
                  {row.spendUsd != null ? `$${row.spendUsd.toFixed(0)}` : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
