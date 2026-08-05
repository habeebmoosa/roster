import { notFound } from "next/navigation";
import {
  DetailAboutTab,
  DetailApiTab,
  DetailConnectorsTab,
  DetailHeader,
  DetailModelTab,
  DetailStats,
  formatTokenCount,
} from "@/features/workers";
import { env } from "@/lib/env";
import { auth } from "@/server/auth";
import { getAgentDefinition, getAgentStatus } from "@/server/db/repositories/agent.repository";
import { countConversationsSince } from "@/server/db/repositories/conversation.repository";
import { listAgentConnectors } from "@/server/mcp/connect-service";
import { sumCostSince, sumTokensSince } from "@/server/db/repositories/usage-event.repository";
import { listUserProviders } from "@/server/providers/service";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/ui";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function WorkerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [definition, session] = await Promise.all([getAgentDefinition(id), auth()]);
  if (!definition) notFound();

  const userId = session?.user?.id;
  const since30d = new Date(Date.now() - THIRTY_DAYS_MS);
  const [status, providerKeys, connectors, conversations30d, spend30dUsd, tokens30d] = await Promise.all([
    getAgentStatus(id),
    userId ? listUserProviders(userId) : Promise.resolve([]),
    userId ? listAgentConnectors(userId, id) : Promise.resolve([]),
    userId ? countConversationsSince(userId, id, since30d) : Promise.resolve(null),
    userId ? sumCostSince(userId, since30d, id) : Promise.resolve(null),
    userId ? sumTokensSince(userId, id, since30d) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-4 py-6">
      <DetailHeader agentId={id} name={definition.name} role={definition.role} status={status ?? "active"} />

      {/* uptimePct: no uptime concept exists yet — honestly "—", never a fabricated number. */}
      <DetailStats
        conversations30d={conversations30d}
        spend30dUsd={spend30dUsd}
        tokens30dLabel={tokens30d ? formatTokenCount(tokens30d.input + tokens30d.output) : null}
        uptimePct={null}
      />

      <Tabs defaultValue="about">
        <TabsList>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="model">Model</TabsTrigger>
          <TabsTrigger value="connectors">Connectors</TabsTrigger>
          <TabsTrigger value="api">API Access</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsPanel value="about">
            <DetailAboutTab
              identity={definition.identity}
              voice={definition.voice}
              expertise={definition.expertise}
              abilities={definition.abilities}
              recentActivity={[]}
            />
          </TabsPanel>
          <TabsPanel value="model">
            <DetailModelTab agentId={id} currentModel={definition.model ?? null} providerKeys={providerKeys} />
          </TabsPanel>
          <TabsPanel value="connectors">
            <DetailConnectorsTab agentId={id} connectors={connectors} />
          </TabsPanel>
          <TabsPanel value="api">
            <DetailApiTab agentId={id} appUrl={env.APP_URL} />
          </TabsPanel>
        </div>
      </Tabs>
    </div>
  );
}
