import { NextResponse } from "next/server";
import { parseAgentDefinition } from "@/core/agent";
import { auth } from "@/server/auth";
import { getAgentDefinition, upsertAgent } from "@/server/db/repositories/agent.repository";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  let definition;
  try {
    definition = parseAgentDefinition(await req.json().catch(() => null));
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "bad_request",
          message: err instanceof Error ? err.message : "Invalid agent definition.",
        },
      },
      { status: 400 },
    );
  }

  const existing = await getAgentDefinition(definition.id);
  if (existing) {
    return NextResponse.json(
      {
        error: {
          code: "conflict",
          message: `An employee with the id "${definition.id}" already exists. Try a different name.`,
        },
      },
      { status: 409 },
    );
  }

  await upsertAgent(definition);
  return NextResponse.json({ id: definition.id }, { status: 201 });
}
