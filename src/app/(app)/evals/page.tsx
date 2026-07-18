import { listEvalRuns } from "@/server/db/repositories/eval-run.repository";
import { Card, CardDescription, CardTitle, Container } from "@/ui";

function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

export default async function EvalsPage() {
  const runs = await listEvalRuns();

  return (
    <Container className="py-12">
      <h1 className="text-2xl font-bold tracking-tight">Evals</h1>
      <p className="mt-2 text-neutral-600">
        Task success rate across model tiers over time — the moat, made measurable. Run{" "}
        <code className="text-brand font-mono">npm run eval</code> to add rows.
      </p>

      <div className="mt-8">
        {runs.length === 0 ? (
          <Card>
            <CardTitle>No eval runs yet</CardTitle>
            <CardDescription>
              Configure eval tiers (see <code className="font-mono">.env.example</code>) and run{" "}
              <code className="font-mono">npm run eval</code>.
            </CardDescription>
          </Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500">
                  <th className="py-2 pr-4 font-medium">When</th>
                  <th className="py-2 pr-4 font-medium">Agent</th>
                  <th className="py-2 pr-4 font-medium">Tier</th>
                  <th className="py-2 pr-4 font-medium">Model</th>
                  <th className="py-2 pr-4 font-medium">Pass</th>
                  <th className="py-2 pr-4 font-medium">Success</th>
                  <th className="py-2 pr-4 font-medium">Avg tokens</th>
                  <th className="py-2 font-medium">Avg latency</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b border-neutral-100">
                    <td className="py-2 pr-4 text-neutral-500">{run.createdAt.toLocaleString()}</td>
                    <td className="py-2 pr-4">{run.agentId}</td>
                    <td className="py-2 pr-4">{run.modelTier}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{run.modelLabel}</td>
                    <td className="py-2 pr-4">
                      {run.passed}/{run.total}
                    </td>
                    <td className="py-2 pr-4 font-medium">{pct(run.successRate)}</td>
                    <td className="py-2 pr-4">{run.avgTokens.toFixed(0)}</td>
                    <td className="py-2">{run.avgLatencyMs.toFixed(0)}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </Container>
  );
}
