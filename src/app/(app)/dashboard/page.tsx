import { QuickActions, StatTiles, UsageCost, WorkerPreview, getGreeting } from "@/features/dashboard";
import { formatLastActivity, type WorkerRow } from "@/features/workers";
import { auth } from "@/server/auth";
import { listAgentSummaries } from "@/server/db/repositories/agent.repository";
import {
  countConversationsSinceByAgent,
  getLastActivityByAgent,
} from "@/server/db/repositories/conversation.repository";
import { getLatestOverallSuccessRate } from "@/server/db/repositories/eval-run.repository";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const since30d = new Date(Date.now() - THIRTY_DAYS_MS);

  const [agents, overallSuccessRate, conversationsByAgent, lastActivityByAgent] = await Promise.all([
    listAgentSummaries(),
    getLatestOverallSuccessRate(),
    userId ? countConversationsSinceByAgent(userId, since30d) : Promise.resolve(new Map<string, number>()),
    userId ? getLastActivityByAgent(userId) : Promise.resolve(new Map<string, Date>()),
  ]);

  // No pause/disable concept yet, so every seeded agent counts as "active".
  const activeEmployees = agents.length;
  const totalEmployees = agents.length;
  const conversations30d = [...conversationsByAgent.values()].reduce((sum, n) => sum + n, 0);

  // spendUsd: no usage/cost-tracking pipeline exists yet — honestly null,
  // rendered as an empty state, never a fabricated number.
  const workerRows: WorkerRow[] = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    status: "Active",
    model: agent.model?.model ?? null,
    conversations30d: conversationsByAgent.get(agent.id) ?? 0,
    lastActivity: lastActivityByAgent.has(agent.id)
      ? formatLastActivity(lastActivityByAgent.get(agent.id)!)
      : null,
    spendUsd: null,
  }));

  return (
    <div className="py-6">
      <h1 className="text-text text-2xl font-bold tracking-tight">{getGreeting()}</h1>
      <p className="text-text-muted mt-1">Here&apos;s what your roster is up to today.</p>

      <div className="mt-6">
        <StatTiles
          activeEmployees={activeEmployees}
          totalEmployees={totalEmployees}
          conversations30d={userId ? conversations30d : null}
          spendThisMonthUsd={null}
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
