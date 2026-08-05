import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { getAgentDefinition, updateAgentStatus } from "@/server/db/repositories/agent.repository";

export const runtime = "nodejs";

const bodySchema = z.object({
  status: z.enum(["active", "paused"]),
});

/**
 * Pauses/resumes an employee. Pausing never touches its definition,
 * knowledge, connectors, or conversation history — it only blocks new chat
 * turns (streamAgentChat throws AgentPausedError), checked uniformly for
 * both the chat UI and the REST API since both funnel through it.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Invalid request." } },
      { status: 400 },
    );
  }

  const { id } = await params;
  const definition = await getAgentDefinition(id);
  if (!definition) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Employee not found." } },
      { status: 404 },
    );
  }

  await updateAgentStatus(id, parsed.data.status);
  return NextResponse.json({ ok: true, status: parsed.data.status });
}
