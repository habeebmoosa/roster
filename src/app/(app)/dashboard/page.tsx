import {
  FIXTURE_CONVERSATIONS_30D,
  FIXTURE_SPEND_THIS_MONTH_USD,
  QuickActions,
  RosterPreview,
  StatTiles,
  UsageCost,
  fixtureMetricsForAgent,
  getGreeting,
  type RosterPreviewRow,
} from "@/features/dashboard";
import { listAgentSummaries } from "@/server/db/repositories/agent.repository";
import { getLatestOverallSuccessRate } from "@/server/db/repositories/eval-run.repository";

export default async function DashboardPage() {
  const [agents, overallSuccessRate] = await Promise.all([
    listAgentSummaries(),
    getLatestOverallSuccessRate(),
  ]);

  // No pause/disable concept yet, so every seeded agent counts as "active".
  const activeEmployees = agents.length;
  const totalEmployees = agents.length;

  const rosterRows: RosterPreviewRow[] = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    status: "Active",
    ...fixtureMetricsForAgent(agent.id),
  }));

  return (
    <div className="px-6 py-6">
      <h1 className="text-text text-2xl font-bold tracking-tight">{getGreeting()}</h1>
      <p className="text-text-muted mt-1">Here&apos;s what your roster is up to today.</p>

      <div className="mt-6">
        <StatTiles
          activeEmployees={activeEmployees}
          totalEmployees={totalEmployees}
          conversations30d={FIXTURE_CONVERSATIONS_30D}
          spendThisMonthUsd={FIXTURE_SPEND_THIS_MONTH_USD}
          evalSuccessRatePct={overallSuccessRate ? overallSuccessRate.rate * 100 : null}
        />
      </div>

      <div className="mt-6">
        <QuickActions />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RosterPreview rows={rosterRows} />
        </div>
        <UsageCost entries={rosterRows.map((r) => ({ name: r.name, spendUsd: r.spendUsd }))} />
      </div>
    </div>
  );
}
