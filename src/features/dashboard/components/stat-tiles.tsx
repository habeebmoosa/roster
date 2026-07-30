import { StatTile } from "@/ui";

export interface StatTilesProps {
  activeEmployees: number;
  totalEmployees: number;
  conversations30d: number;
  spendThisMonthUsd: number;
  evalSuccessRatePct: number | null;
}

export function StatTiles({
  activeEmployees,
  totalEmployees,
  conversations30d,
  spendThisMonthUsd,
  evalSuccessRatePct,
}: StatTilesProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatTile label="Active employees" value={`${activeEmployees} / ${totalEmployees}`} />
      <StatTile label="Conversations · 30d" value={conversations30d.toLocaleString()} />
      <StatTile label="Spend this month" value={`$${spendThisMonthUsd.toFixed(2)}`} />
      <StatTile
        label="Eval success rate"
        value={evalSuccessRatePct === null ? "—" : `${evalSuccessRatePct.toFixed(0)}%`}
        sublabel={evalSuccessRatePct === null ? "No eval runs yet" : undefined}
      />
    </div>
  );
}
