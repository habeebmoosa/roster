import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { ByokError } from "@/core/providers";
import { auth } from "@/server/auth";
import { removeProviderCredential, updateProviderCredential } from "@/server/providers/service";

export const runtime = "nodejs";
// A model-carrying edit re-validates with a live 1-token request, same as
// adding a credential — one outbound call, latency-dependent on the provider.
export const maxDuration = 30;

const bodySchema = z.object({
  label: z.string().trim().min(1).optional(),
  apiKey: z.string().min(1).optional(),
  secrets: z.record(z.string(), z.string()).optional(),
  baseUrl: z.string().trim().nullable().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  model: z.string().min(1).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ credentialId: string }> },
) {
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

  const { credentialId } = await params;

  try {
    const updated = await updateProviderCredential(session.user.id, credentialId, parsed.data);
    return NextResponse.json({ ok: true, credential: updated });
  } catch (err) {
    if (err instanceof ByokError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.userMessage } },
        { status: err.code === "not_found" ? 404 : 400 },
      );
    }
    Sentry.captureException(err);
    return NextResponse.json(
      { error: { code: "unknown", message: "Unexpected error." } },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ credentialId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }
  const { credentialId } = await params;
  await removeProviderCredential(session.user.id, credentialId);
  return NextResponse.json({ ok: true });
}
