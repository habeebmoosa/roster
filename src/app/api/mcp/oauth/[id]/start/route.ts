import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { startOAuthConnect } from "@/server/mcp/connect-service";
import { setPendingOAuthConnect } from "@/server/mcp/oauth-pending-cookie";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const { id } = await params;
  const redirectUri = new URL("/api/mcp/oauth/callback", req.url).toString();

  try {
    const { authorizationUrl, pending } = await startOAuthConnect(session.user.id, id, redirectUri);
    await setPendingOAuthConnect(pending);
    return NextResponse.redirect(authorizationUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start connection.";
    return NextResponse.redirect(
      new URL(`/connectors?error=${encodeURIComponent(message)}`, req.url),
    );
  }
}
