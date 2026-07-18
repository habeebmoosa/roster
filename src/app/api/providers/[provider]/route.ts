import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { removeProviderKey } from "@/server/providers/service";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }
  const { provider } = await params;
  await removeProviderKey(session.user.id, provider);
  return NextResponse.json({ ok: true });
}
