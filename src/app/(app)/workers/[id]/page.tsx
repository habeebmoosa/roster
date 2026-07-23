import { notFound } from "next/navigation";
import {
  DetailAboutTab,
  DetailApiTab,
  DetailHeader,
  DetailModelTab,
  DetailStats,
  detailFixturesForAgent,
} from "@/features/workers";
import { getAgentDefinition } from "@/server/db/repositories/agent.repository";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/ui";

export default async function WorkerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const definition = await getAgentDefinition(id);
  if (!definition) notFound();

  const fixtures = detailFixturesForAgent(id);

  return (
    <div className="flex flex-col gap-4 p-6">
      <DetailHeader name={definition.name} role={definition.role} status={fixtures.status} />

      <DetailStats
        conversations30d={fixtures.conversations30d}
        spend30dUsd={fixtures.spend30dUsd}
        tokens30dLabel={fixtures.tokens30dLabel}
        uptimePct={fixtures.uptimePct}
      />

      <Tabs defaultValue="about">
        <TabsList>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="model">Model</TabsTrigger>
          <TabsTrigger value="api">API access</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsPanel value="about">
            <DetailAboutTab
              identity={definition.identity}
              voice={definition.voice}
              expertise={definition.expertise}
              abilities={definition.abilities}
              recentActivity={fixtures.recentActivity}
            />
          </TabsPanel>
          <TabsPanel value="model">
            <DetailModelTab
              provider={fixtures.provider}
              tier={fixtures.tier}
              model={fixtures.model}
            />
          </TabsPanel>
          <TabsPanel value="api">
            <DetailApiTab agentId={id} />
          </TabsPanel>
        </div>
      </Tabs>
    </div>
  );
}
