import { z } from "zod";
import { ByokError, mapProviderError } from "@/core/providers";
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

  // Pre-stream failures (missing agent/conversation, no key, bad base URL) → clean status code.
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
    const byok = err instanceof ByokError ? err : mapProviderError(err);
    return Response.json(
      { error: { code: byok.code, message: byok.userMessage } },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`\n\n⚠️ ${mapProviderError(err).userMessage}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Conversation-Id": result.conversationId,
    },
  });
}
