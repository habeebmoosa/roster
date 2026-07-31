import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { setDefaultProviderCredential } from "@/server/providers/service";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ provider: string; credentialId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }
  const { provider, credentialId } = await params;
  await setDefaultProviderCredential(session.user.id, provider, credentialId);
  return NextResponse.json({ ok: true });
}
