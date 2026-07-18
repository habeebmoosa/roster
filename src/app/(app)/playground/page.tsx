import Link from "next/link";
import { listAgentSummaries } from "@/server/agents/service";
import { auth } from "@/server/auth";
import { listUserProviders } from "@/server/providers/service";
import { Card, CardDescription, CardTitle, Container } from "@/ui";
import { Playground } from "./playground";

export default async function PlaygroundPage() {
  const session = await auth();
  const [agents, keys] = await Promise.all([
    listAgentSummaries(),
    session?.user?.id ? listUserProviders(session.user.id) : Promise.resolve([]),
  ]);
  const configured = keys.map((key) => key.provider);

  return (
    <Container className="py-12">
      <h1 className="text-2xl font-bold tracking-tight">Playground</h1>
      <p className="mt-2 text-neutral-600">
        Chat with an employee on any model you&apos;ve configured. Same{" "}
        <code className="text-brand font-mono">runAgent()</code> path the chat UI and REST API will
        use.
      </p>

      <div className="mt-8">
        {configured.length === 0 ? (
          <Card>
            <CardTitle>No providers configured</CardTitle>
            <CardDescription>
              Add a provider key first, then come back to chat with an employee.{" "}
              <Link href="/settings/providers" className="text-brand hover:underline">
                Add a provider →
              </Link>
            </CardDescription>
          </Card>
        ) : (
          <Playground agents={agents} configured={configured} />
        )}
      </div>
    </Container>
  );
}
