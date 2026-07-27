import { NextResponse } from "next/server";
import { getConversationWithMessages } from "@/server/db/repositories/conversation.repository";
import { auth } from "@/server/auth";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const { id } = await params;
  const conversation = await getConversationWithMessages(session.user.id, id);
  if (!conversation) {
    return NextResponse.json(
      { error: { code: "conversation_not_found", message: "That conversation doesn't exist." } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      agentId: conversation.agentId,
      title: conversation.title,
      messages: conversation.messages.map((m) => ({
        role: m.role,
        content: m.content,
        stepEvents: m.stepEvents ?? undefined,
      })),
    },
  });
}
