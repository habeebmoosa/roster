import Link from "next/link";
import { Topbar } from "@/components/layout";
import {
  WorkersPagination,
  WorkersTable,
  WorkersToolbar,
  filterAndPaginateWorkers,
  formatLastActivity,
  type WorkerRow,
} from "@/features/workers";
import { auth } from "@/server/auth";
import { listAgentSummaries } from "@/server/db/repositories/agent.repository";
import {
  countConversationsSinceByAgent,
  getLastActivityByAgent,
} from "@/server/db/repositories/conversation.repository";
import { sumCostSinceByAgent } from "@/server/db/repositories/usage-event.repository";
import { Button, Card } from "@/ui";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function WorkersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;
  const since30d = new Date(Date.now() - THIRTY_DAYS_MS);

  const [agents, conversationsByAgent, lastActivityByAgent, spendByAgent] = await Promise.all([
    listAgentSummaries(),
    userId ? countConversationsSinceByAgent(userId, since30d) : Promise.resolve(new Map<string, number>()),
    userId ? getLastActivityByAgent(userId) : Promise.resolve(new Map<string, Date>()),
    userId ? sumCostSinceByAgent(userId, since30d) : Promise.resolve(new Map<string, number>()),
  ]);

  const allRows: WorkerRow[] = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    status: "Active",
    model: agent.model?.model ?? null,
    conversations30d: conversationsByAgent.get(agent.id) ?? 0,
    lastActivity: lastActivityByAgent.has(agent.id)
      ? formatLastActivity(lastActivityByAgent.get(agent.id)!)
      : null,
    // Only agents with at least one *priced* usage event in the window get a
    // real number — an agent that's only ever used an uncatalogued model
    // stays honestly null, same "never fabricate" posture as everywhere else.
    spendUsd: spendByAgent.get(agent.id) ?? null,
  }));

  const result = filterAndPaginateWorkers(allRows, {
    q,
    page: page ? Number(page) : undefined,
  });

  return (
    <div>
      <Topbar
        title="Workers"
        actions={
          <Link href="/hire">
            <Button>+ Hire employee</Button>
          </Link>
        }
      />
      <div className="flex flex-col gap-4 pb-6">
        <WorkersToolbar query={q ?? ""} />
        <Card className="p-4">
          <WorkersTable rows={result.rows} />
        </Card>
        <WorkersPagination
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          query={q ?? ""}
        />
      </div>
    </div>
  );
}
