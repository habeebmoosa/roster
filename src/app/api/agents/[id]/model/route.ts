import { NextResponse } from "next/server";
import { z } from "zod";
import { getProvider } from "@/core/providers/catalog";
import { auth } from "@/server/auth";
import { getAgentDefinition, upsertAgent } from "@/server/db/repositories/agent.repository";
import { listUserProviders } from "@/server/providers/service";

export const runtime = "nodejs";

const bodySchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
});

/**
 * Sets an employee's default provider/model — what the REST API
 * (server/rest/chat.ts's resolveChatRequest) falls back to when a caller
 * doesn't specify one explicitly. Requires the provider to be one the
 * signed-in user has actually connected (Settings), same constraint the
 * hire wizard applies when first setting this.
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

  const { provider, model } = parsed.data;
  if (!getProvider(provider)) {
    return NextResponse.json(
      { error: { code: "unknown_provider", message: "Unknown provider." } },
      { status: 400 },
    );
  }

  const connected = await listUserProviders(session.user.id);
  if (!connected.some((key) => key.provider === provider)) {
    return NextResponse.json(
      {
        error: {
          code: "provider_not_connected",
          message: "Connect this provider in Settings before assigning it here.",
        },
      },
      { status: 400 },
    );
  }

  await upsertAgent({ ...definition, model: { provider, model } });
  return NextResponse.json({ ok: true, model: { provider, model } });
}
