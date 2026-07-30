import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { createFeedback } from "@/server/db/repositories/feedback.repository";

export const runtime = "nodejs";

const bodySchema = z.object({
  message: z.string().trim().min(1),
});

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

  await createFeedback({ userId: session.user.id, message: parsed.data.message });
  return NextResponse.json({ ok: true });
}
