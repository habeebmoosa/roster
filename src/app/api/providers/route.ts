import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { ByokError } from "@/core/providers";
import { auth } from "@/server/auth";
import { addProviderKey } from "@/server/providers/service";

export const runtime = "nodejs";
// addProviderKey validates the key with a live 1-token request to the
// provider before persisting — one outbound call, latency-dependent on that
// provider, not us.
export const maxDuration = 30;

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
    // A ByokError means the provider rejected the request (expected, user-actionable);
    // anything else here is genuinely unexpected — worth knowing about.
    Sentry.captureException(err);
    return NextResponse.json(
      { error: { code: "unknown", message: "Unexpected error." } },
      { status: 500 },
    );
  }
}
