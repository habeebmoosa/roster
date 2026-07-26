import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { addCustomServer, listMcpServersForUser } from "@/server/mcp/connect-service";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  connectorUrl: z.string().url(),
  authType: z.enum(["oauth_dcr", "static_headers", "none"]),
  categories: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }
  const servers = await listMcpServersForUser(session.user.id);
  return NextResponse.json({ servers });
}

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

  const server = await addCustomServer(session.user.id, parsed.data);
  return NextResponse.json({ server });
}
