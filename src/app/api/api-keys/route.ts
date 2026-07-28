import { NextResponse } from "next/server";
import { z } from "zod";
import { createApiKey } from "@/server/db/repositories/api-key.repository";
import { auth } from "@/server/auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  label: z.string().trim().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Invalid request." } },
      { status: 400 },
    );
  }

  const { summary, rawKey } = await createApiKey(
    session.user.id,
    parsed.data.label || "Untitled key",
  );
  return NextResponse.json({ key: summary, rawKey });
}
