import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { connectManually } from "@/server/mcp/connect-service";

export const runtime = "nodejs";

const bodySchema = z.object({
  headers: z.record(z.string().min(1), z.string().min(1)).default({}),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({ headers: {} })));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "bad_request",
          message: parsed.error.issues[0]?.message ?? "Invalid request.",
        },
      },
      { status: 400 },
    );
  }

  const { id } = await params;
  try {
    await connectManually(session.user.id, id, parsed.data.headers);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "bad_request",
          message: err instanceof Error ? err.message : "Failed to connect.",
        },
      },
      { status: 400 },
    );
  }
}
