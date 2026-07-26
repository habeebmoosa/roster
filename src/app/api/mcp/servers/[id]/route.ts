import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { getMcpServerForUser } from "@/server/mcp/connect-service";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }
  const { id } = await params;
  const server = await getMcpServerForUser(session.user.id, id);
  if (!server) {
    return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });
  }
  return NextResponse.json({ server });
}
