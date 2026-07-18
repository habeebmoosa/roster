import { NextResponse } from "next/server";
import { z } from "zod";
import { ByokError } from "@/core/providers";
import { auth } from "@/server/auth";
import { addProviderKey } from "@/server/providers/service";

export const runtime = "nodejs";

const bodySchema = z.object({
  provider: z.string().min(1),
  apiKey: z.string().min(1),
  model: z.string().min(1),
  baseUrl: z.string().trim().optional(),
  label: z.string().trim().optional(),
});

export async function POST(req: Request) {
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

  try {
    await addProviderKey({ userId: session.user.id, ...parsed.data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ByokError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.userMessage } },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: { code: "unknown", message: "Unexpected error." } },
      { status: 500 },
    );
  }
}
