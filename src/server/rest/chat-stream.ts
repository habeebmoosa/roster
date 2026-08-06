import { ByokError, mapProviderError } from "@/core/providers";
import { AgentPausedError, streamAgentChat, type StreamAgentChatInput } from "@/server/agents/service";
import { logUsageEvent } from "@/server/analytics/usage";

/**
 * SSE framing for the REST API — deliberately not the AI SDK's UI Message
 * Stream protocol (Phase 11), which is paired to the Next.js chat client.
 * Third-party callers (curl, plain fetch/requests) get a minimal, documented
 * shape instead: `data: {"type":"delta","content":"..."}` per chunk, a
 * trailing `data: [DONE]` on success (OpenAI's own convention), or
 * `data: {"type":"error","error":{"code","message"}}` if the model call fails
 * mid-stream — the only place a BYOK failure (bad/missing key, rate limit,
 * quota) can be discovered, since resolving credentials happens lazily.
 */
const encoder = new TextEncoder();

function sseFrame(payload: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export function streamRestChat(input: StreamAgentChatInput): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let result: Awaited<ReturnType<typeof streamAgentChat>> | undefined;
      try {
        result = await streamAgentChat(input);
        for await (const chunk of result.textStream) {
          controller.enqueue(sseFrame({ type: "delta", content: chunk }));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        if (err instanceof AgentPausedError) {
          controller.enqueue(
            sseFrame({
              type: "error",
              error: { code: "agent_paused", message: "This employee is paused." },
            }),
          );
        } else {
          const byokError = err instanceof ByokError ? err : mapProviderError(err);
          controller.enqueue(
            sseFrame({
              type: "error",
              error: { code: byokError.code, message: byokError.userMessage },
            }),
          );
        }
      }

      // Best-effort — the REST API never creates a Conversation, so this is
      // the only place its usage gets captured at all. A logging failure
      // must never surface to the caller as a chat error.
      if (result) {
        try {
          const usage = await result.usage;
          await logUsageEvent({
            userId: input.userId,
            agentId: input.agentId,
            source: "rest",
            provider: input.provider,
            model: input.model,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
          });
        } catch (err) {
          console.error(`Failed to capture REST usage for agent "${input.agentId}":`, err);
        }
      }

      controller.close();
    },
  });
}
