import { createUIMessageStreamResponse } from "ai";
import { z } from "zod";
import { AgentNotFoundError } from "@/server/agents/service";
import { auth } from "@/server/auth";
import { ConversationNotFoundError, sendChatMessage } from "@/server/chat/service";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  agentId: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  conversationId: z.string().min(1).optional(),
  content: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: { message: "Invalid request." } }, { status: 400 });
  }

  // Only request-validity failures (unknown agent/conversation) happen before we commit
  // to a streaming response — BYOK failures happen inside the stream itself as a
  // structured `error` part (11.4), since only attempting the model call reveals them.
  let result: Awaited<ReturnType<typeof sendChatMessage>>;
  try {
    result = await sendChatMessage({ userId: session.user.id, ...parsed.data });
  } catch (err) {
    if (err instanceof AgentNotFoundError) {
      return Response.json(
        { error: { code: "agent_not_found", message: "That agent doesn't exist." } },
        { status: 404 },
      );
    }
    if (err instanceof ConversationNotFoundError) {
      return Response.json(
        { error: { code: "conversation_not_found", message: "That conversation doesn't exist." } },
        { status: 404 },
      );
    }
    return Response.json({ error: { message: "Something went wrong." } }, { status: 500 });
  }

  return createUIMessageStreamResponse({
    stream: result.stream,
    headers: { "X-Conversation-Id": result.conversationId },
  });
}
