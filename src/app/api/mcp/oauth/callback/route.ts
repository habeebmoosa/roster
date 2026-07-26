import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { completeOAuthConnect } from "@/server/mcp/connect-service";
import { takePendingOAuthConnect } from "@/server/mcp/oauth-pending-cookie";

export const runtime = "nodejs";

function redirectWithError(req: Request, message: string) {
  return NextResponse.redirect(
    new URL(`/connectors?error=${encodeURIComponent(message)}`, req.url),
  );
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const pending = await takePendingOAuthConnect();
  if (!pending)
    return redirectWithError(req, "Connection expired or was already completed — try again.");
  if (pending.userId !== session.user.id)
    return redirectWithError(req, "Session mismatch — try again.");
  if (oauthError) return redirectWithError(req, `Authorization was denied: ${oauthError}`);
  if (!code || !state) return redirectWithError(req, "Missing authorization response — try again.");

  try {
    await completeOAuthConnect(pending, code, state);
  } catch (err) {
    return redirectWithError(
      req,
      err instanceof Error ? err.message : "Failed to complete connection.",
    );
  }

  return NextResponse.redirect(new URL(`/connectors?connected=${pending.serverId}`, req.url));
}
