import { NextResponse } from "next/server";
import { revokeApiKey } from "@/server/db/repositories/api-key.repository";
import { auth } from "@/server/auth";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }
  const { id } = await params;
  await revokeApiKey(session.user.id, id);
  return NextResponse.json({ ok: true });
}
