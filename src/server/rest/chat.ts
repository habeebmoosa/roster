import { z } from "zod";
import type { AgentDefinition, AgentMessage } from "@/core/agent";

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

export class RateLimitedError extends Error {
  constructor(readonly resetAt: Date) {
    super("Rate limit exceeded.");
    this.name = "RateLimitedError";
  }
}

export const chatRequestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1) }))
    .min(1),
  // Default to the agent's own configured model (set by the Hire wizard) when omitted.
  provider: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  // A per-request key the caller never stored in their account at all — used
  // instead of a stored provider key for this call only, never persisted.
  apiKey: z.string().min(1).optional(),
  baseUrl: z.string().url().optional(),
});

export type ChatRequestBody = z.infer<typeof chatRequestSchema>;

export interface ResolvedChatRequest {
  messages: AgentMessage[];
  provider: string;
  model: string;
  ephemeralKey?: { apiKey: string; baseUrl?: string };
}

/**
 * Validates the request body and resolves provider/model: the caller's own
 * values when given, otherwise the agent's configured default (`AgentDefinition.model`,
 * set by the Hire wizard). Throws {@link BadRequestError} for a malformed body
 * or when neither the caller nor the agent specifies a model.
 */
export function resolveChatRequest(
  rawBody: unknown,
  definition: AgentDefinition,
): ResolvedChatRequest {
  const parsed = chatRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new BadRequestError(`Invalid request body: ${issues}`);
  }
  const body = parsed.data;

  const provider = body.provider ?? definition.model?.provider;
  const model = body.model ?? definition.model?.model;
  if (!provider || !model) {
    throw new BadRequestError(
      "This agent has no default model configured — specify `provider` and `model` in the request.",
    );
  }

  return {
    messages: body.messages,
    provider,
    model,
    ephemeralKey: body.apiKey ? { apiKey: body.apiKey, baseUrl: body.baseUrl } : undefined,
  };
}
