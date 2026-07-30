import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { disconnectMcpServer } from "@/server/mcp/connect-service";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }
  const { id } = await params;
  await disconnectMcpServer(session.user.id, id);
  return NextResponse.json({ ok: true });
}
