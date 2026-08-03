import { HireWizard } from "@/features/hire";
import { auth } from "@/server/auth";
import { listMcpServersForUser } from "@/server/mcp/connect-service";
import { listUserProviders } from "@/server/providers/service";

export default async function HirePage() {
  const session = await auth();
  const userId = session?.user?.id;
  const [providerKeys, mcpServers] = await Promise.all([
    userId ? listUserProviders(userId) : Promise.resolve([]),
    userId ? listMcpServersForUser(userId) : Promise.resolve([]),
  ]);
  const connectors = mcpServers.filter((server) => server.connected);

  return (
    <div className="py-6">
      <h1 className="text-text text-2xl font-bold tracking-tight">Hire a new employee</h1>
      <p className="text-text-muted mt-1">
        Set up an AI employee&apos;s identity, knowledge, abilities, and model.
      </p>

      <div className="mt-6">
        <HireWizard providerKeys={providerKeys} connectors={connectors} />
      </div>
    </div>
  );
}
