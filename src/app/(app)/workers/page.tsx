import { Topbar } from "@/components/layout";
import {
  WorkersPagination,
  WorkersTable,
  WorkersToolbar,
  fixtureMetricsForAgent,
  filterAndPaginateWorkers,
  type WorkerRow,
} from "@/features/workers";
import { listAgentSummaries } from "@/server/db/repositories/agent.repository";
import { Card } from "@/ui";

export default async function WorkersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const agents = await listAgentSummaries();

  const allRows: WorkerRow[] = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    status: "Active",
    ...fixtureMetricsForAgent(agent.id),
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
          // Hire wizard doesn't exist yet — same disabled treatment as the
          // sidebar/dashboard CTAs (sub-phase 6.10).
          <Card className="text-text-faint px-4 py-2 text-sm font-semibold" title="Coming soon">
            + Hire employee
          </Card>
        }
      />
      <div className="flex flex-col gap-4 px-6 pb-6">
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
