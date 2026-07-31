import { ConnectorsBoard } from "@/features/connectors";
import { auth } from "@/server/auth";
import { listMcpServersForUser } from "@/server/mcp/connect-service";

export default async function ConnectorsPage() {
  const session = await auth();
  const connectors = session?.user?.id ? await listMcpServersForUser(session.user.id) : [];

  return (
    <div className="py-6">
      <h1 className="text-text text-2xl font-bold tracking-tight">Connectors</h1>
      <p className="text-text-muted mt-1">
        MCP servers your employees can use — browse the directory or add your own.
      </p>

      <div className="mt-6">
        <ConnectorsBoard connectors={connectors} />
      </div>
    </div>
  );
}
