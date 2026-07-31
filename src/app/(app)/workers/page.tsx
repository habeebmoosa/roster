import Link from "next/link";
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
import { Button, Card } from "@/ui";

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
