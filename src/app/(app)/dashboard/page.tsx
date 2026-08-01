import {
  QuickActions,
  StatTiles,
  UsageCost,
  WorkerPreview,
  getGreeting,
} from "@/features/dashboard";
import {
  FIXTURE_CONVERSATIONS_30D_TOTAL,
  FIXTURE_SPEND_THIS_MONTH_USD,
  fixtureMetricsForAgent,
  type WorkerRow,
} from "@/features/workers";
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

  const workerRows: WorkerRow[] = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    status: "Active",
    model: agent.model?.model ?? null,
    ...fixtureMetricsForAgent(agent.id),
  }));

  return (
    <div className="py-6">
      <h1 className="text-text text-2xl font-bold tracking-tight">{getGreeting()}</h1>
      <p className="text-text-muted mt-1">Here&apos;s what your roster is up to today.</p>

      <div className="mt-6">
        <StatTiles
          activeEmployees={activeEmployees}
          totalEmployees={totalEmployees}
          conversations30d={FIXTURE_CONVERSATIONS_30D_TOTAL}
          spendThisMonthUsd={FIXTURE_SPEND_THIS_MONTH_USD}
          evalSuccessRatePct={overallSuccessRate ? overallSuccessRate.rate * 100 : null}
        />
      </div>

      <div className="mt-6">
        <QuickActions />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WorkerPreview rows={workerRows} />
        </div>
        <UsageCost
          entries={workerRows.map((r) => ({ id: r.id, name: r.name, spendUsd: r.spendUsd }))}
        />
      </div>
    </div>
  );
}
