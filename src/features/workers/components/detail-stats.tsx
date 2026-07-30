import { StatTile } from "@/ui";

export function DetailStats({
  conversations30d,
  spend30dUsd,
  tokens30dLabel,
  uptimePct,
}: {
  conversations30d: number;
  spend30dUsd: number;
  tokens30dLabel: string;
  uptimePct: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatTile label="Conversations" value={conversations30d.toLocaleString()} />
      <StatTile label="Spend · 30d" value={`$${spend30dUsd.toFixed(0)}`} />
      <StatTile label="Tokens · 30d" value={tokens30dLabel} />
      <StatTile label="Uptime" value={`${uptimePct.toFixed(1)}%`} />
    </div>
  );
}
