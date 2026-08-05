import { notFound } from "next/navigation";
import {
  DetailAboutTab,
  DetailApiTab,
  DetailConnectorsTab,
  DetailHeader,
  DetailModelTab,
  DetailStats,
} from "@/features/workers";
import { env } from "@/lib/env";
import { auth } from "@/server/auth";
import { getAgentDefinition } from "@/server/db/repositories/agent.repository";
import { countConversationsSince } from "@/server/db/repositories/conversation.repository";
import { listAgentConnectors } from "@/server/mcp/connect-service";
import { listUserProviders } from "@/server/providers/service";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/ui";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function WorkerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [definition, session] = await Promise.all([getAgentDefinition(id), auth()]);
  if (!definition) notFound();

  const userId = session?.user?.id;
  const [providerKeys, connectors, conversations30d] = await Promise.all([
    userId ? listUserProviders(userId) : Promise.resolve([]),
    userId ? listAgentConnectors(userId, id) : Promise.resolve([]),
    userId
      ? countConversationsSince(userId, id, new Date(Date.now() - THIRTY_DAYS_MS))
      : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-4 py-6">
      {/* No pause/disable concept exists yet — every agent is honestly "Active" today. */}
      <DetailHeader name={definition.name} role={definition.role} status="Active" />

      {/* spend30dUsd/tokens30dLabel/uptimePct: no usage-tracking pipeline or
          uptime concept exists yet — honestly "—", never a fabricated number. */}
      <DetailStats
        conversations30d={conversations30d}
        spend30dUsd={null}
        tokens30dLabel={null}
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
