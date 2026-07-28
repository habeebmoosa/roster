import { getAgentDefinition } from "@/server/db/repositories/agent.repository";
import { getRateLimiter } from "@/server/ratelimit";
import { authenticateApiKey, UnauthorizedError } from "@/server/rest/auth";
import { BadRequestError, resolveChatRequest } from "@/server/rest/chat";
import { streamRestChat } from "@/server/rest/chat-stream";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Programmatic access to the same employees as the chat UI — one engine
 * (`runAgent()` via `streamAgentChat`), two surfaces. Unlike chat, this
 * surface is stateless: no `conversationId`, the caller resends its own
 * message history every call (see `detail-api-snippets.ts` for the
 * documented contract this implements).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let auth: { userId: string; apiKeyId: string };
  try {
    auth = await authenticateApiKey(req.headers.get("authorization"));
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return Response.json(
        { error: { code: "unauthorized", message: err.message } },
        { status: 401 },
      );
    }
    throw err;
  }

  const rateLimit = await getRateLimiter().check(auth.userId);
  if (!rateLimit.allowed) {
    const retryAfterSeconds = Math.max(
      0,
      Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000),
    );
    return Response.json(
      { error: { code: "rate_limited", message: "Rate limit exceeded. Try again later." } },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  const { id: agentId } = await params;
  const definition = await getAgentDefinition(agentId);
  if (!definition) {
    return Response.json(
      { error: { code: "agent_not_found", message: "That agent doesn't exist." } },
      { status: 404 },
    );
  }

  let resolved: ReturnType<typeof resolveChatRequest>;
  try {
    resolved = resolveChatRequest(await req.json().catch(() => null), definition);
  } catch (err) {
    if (err instanceof BadRequestError) {
      return Response.json(
        { error: { code: "bad_request", message: err.message } },
        { status: 400 },
      );
    }
    throw err;
  }

  const stream = streamRestChat({
    userId: auth.userId,
    agentId,
    provider: resolved.provider,
    model: resolved.model,
    messages: resolved.messages,
    ephemeralKey: resolved.ephemeralKey,
  });

  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
  });
}
