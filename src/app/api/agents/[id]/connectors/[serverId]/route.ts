import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { enableMcpServerForAgent, disableMcpServerForAgent } from "@/server/db/repositories/agent-mcp-server.repository";
import { getAgentDefinition } from "@/server/db/repositories/agent.repository";
import { listMcpServersForUser } from "@/server/mcp/connect-service";

export const runtime = "nodejs";

/**
 * Enables one of the signed-in user's connected MCP servers for a specific
 * employee — the toggle backing the worker detail page's Connectors tab and
 * the hire wizard's Connectors step. Requires the server to actually be
 * connected (Settings → Connectors first); enabling one that isn't would do
 * nothing at runtime anyway (resolveMcpToolsForAgent gates on both being true).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; serverId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const { id, serverId } = await params;
  const definition = await getAgentDefinition(id);
  if (!definition) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Employee not found." } },
      { status: 404 },
    );
  }

  const connected = await listMcpServersForUser(session.user.id);
  if (!connected.some((server) => server.id === serverId && server.connected)) {
    return NextResponse.json(
      {
        error: {
          code: "connector_not_connected",
          message: "Connect this connector in Settings before assigning it here.",
        },
      },
      { status: 400 },
    );
  }

  await enableMcpServerForAgent(session.user.id, id, serverId);
  return NextResponse.json({ ok: true });
}

/** Disables a connector for an employee. Safe to call even if it wasn't enabled. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; serverId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const { id, serverId } = await params;
  await disableMcpServerForAgent(session.user.id, id, serverId);
  return NextResponse.json({ ok: true });
}
