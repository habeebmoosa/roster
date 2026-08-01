import { notFound } from "next/navigation";
import { getProvider } from "@/core/providers/catalog";
import {
  DetailAboutTab,
  DetailApiTab,
  DetailHeader,
  DetailModelTab,
  DetailStats,
  detailFixturesForAgent,
} from "@/features/workers";
import { auth } from "@/server/auth";
import { getAgentDefinition } from "@/server/db/repositories/agent.repository";
import { listUserProviders } from "@/server/providers/service";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/ui";

export default async function WorkerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [definition, session] = await Promise.all([getAgentDefinition(id), auth()]);
  if (!definition) notFound();

  const providerKeys = session?.user?.id ? await listUserProviders(session.user.id) : [];
  const fixtures = detailFixturesForAgent(id);

  // The hire wizard (6.10) is the first thing that stores a real default model on the
  // definition — older/seeded agents don't have one, so fall back to the fixture.
  const modelInfo = definition.model
    ? {
        provider: getProvider(definition.model.provider)?.label ?? definition.model.provider,
        tier: "Connected",
        model: definition.model.model,
      }
    : { provider: fixtures.provider, tier: fixtures.tier, model: fixtures.model };

  return (
    <div className="flex flex-col gap-4 py-6">
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
          <TabsTrigger value="api">API Access</TabsTrigger>
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
              agentId={id}
              displayProvider={modelInfo.provider}
              displayTier={modelInfo.tier}
              displayModel={modelInfo.model}
              currentModel={definition.model ?? null}
              providerKeys={providerKeys}
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
