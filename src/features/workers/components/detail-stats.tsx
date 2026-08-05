import { StatTile } from "@/ui";

/** Conversations/Spend/Tokens are real (Conversation + UsageEvent), null only when there's genuinely nothing to show. Uptime has no defined concept yet for a stateless, per-request agent — honestly "—", never a fabricated number. */
export function DetailStats({
  conversations30d,
  spend30dUsd,
  tokens30dLabel,
  uptimePct,
}: {
  conversations30d: number | null;
  spend30dUsd: number | null;
  tokens30dLabel: string | null;
  uptimePct: number | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatTile
        label="Conversations"
        value={conversations30d != null ? conversations30d.toLocaleString() : "—"}
      />
      <StatTile
        label="Spend · 30d"
        value={spend30dUsd != null ? `$${spend30dUsd.toFixed(0)}` : "—"}
      />
      <StatTile label="Tokens · 30d" value={tokens30dLabel ?? "—"} />
      <StatTile label="Uptime" value={uptimePct != null ? `${uptimePct.toFixed(1)}%` : "—"} />
    </div>
  );
}
