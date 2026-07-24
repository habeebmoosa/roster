import Link from "next/link";
import { Chat, fixtureConversationsForAgents } from "@/features/chat";
import { listAgentSummaries } from "@/server/agents/service";
import { auth } from "@/server/auth";
import { listUserProviders } from "@/server/providers/service";
import { Card, CardDescription, CardTitle } from "@/ui";

export default async function ChatPage() {
  const session = await auth();
  const [agents, keys] = await Promise.all([
    listAgentSummaries(),
    session?.user?.id ? listUserProviders(session.user.id) : Promise.resolve([]),
  ]);
  const configured = keys.map((key) => key.provider);
  const conversations = fixtureConversationsForAgents(agents);

  if (configured.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardTitle>No providers configured</CardTitle>
          <CardDescription>
            Add a provider key first, then come back to chat with an employee.{" "}
            <Link href="/settings?tab=providers" className="text-accent hover:underline">
              Add a provider →
            </Link>
          </CardDescription>
        </Card>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardTitle>No employees yet</CardTitle>
          <CardDescription>Hire your first AI employee to start chatting.</CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full">
      <Chat agents={agents} configured={configured} conversations={conversations} />
    </div>
  );
}
