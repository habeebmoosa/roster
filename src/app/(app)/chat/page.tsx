import Link from "next/link";
import { Chat, formatConversationDate, type ConversationSummary } from "@/features/chat";
import { listAgentSummaries } from "@/server/agents/service";
import { auth } from "@/server/auth";
import { listConversations } from "@/server/db/repositories/conversation.repository";
import { listUserProviders } from "@/server/providers/service";
import { Card, CardDescription, CardTitle } from "@/ui";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ agentId?: string }>;
}) {
  const { agentId } = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;
  const [agents, keys, rawConversations] = await Promise.all([
    listAgentSummaries(),
    userId ? listUserProviders(userId) : Promise.resolve([]),
    userId ? listConversations(userId) : Promise.resolve([]),
  ]);
  const configured = keys.map((key) => key.provider);
  const agentNameById = new Map(agents.map((agent) => [agent.id, agent.name]));
  const conversations: ConversationSummary[] = rawConversations.map((conversation) => ({
    id: conversation.id,
    employeeId: conversation.agentId,
    employeeName: agentNameById.get(conversation.agentId) ?? conversation.agentId,
    title: conversation.title ?? "New conversation",
    date: formatConversationDate(conversation.updatedAt),
  }));

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
      <Chat
        agents={agents}
        configured={configured}
        conversations={conversations}
        initialAgentId={agentId}
      />
    </div>
  );
}
