import { getModelPricing } from "@/server/db/repositories/model-catalog.repository";
import {
  createUsageEvent,
  type CreateUsageEventInput,
} from "@/server/db/repositories/usage-event.repository";

export interface LogUsageEventInput {
  userId: string;
  agentId: string;
  conversationId?: string | null;
  source: CreateUsageEventInput["source"];
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

function computeCostUsd(
  inputTokens: number,
  outputTokens: number,
  pricing: { inputPricePerMTok: number | null; outputPricePerMTok: number | null } | null,
): number | null {
  if (!pricing || pricing.inputPricePerMTok == null || pricing.outputPricePerMTok == null) {
    return null;
  }
  return (
    (inputTokens / 1_000_000) * pricing.inputPricePerMTok +
    (outputTokens / 1_000_000) * pricing.outputPricePerMTok
  );
}

/**
 * Records one chat turn's real token usage, priced against `ModelCatalog`
 * when the model is in it — a custom/self-hosted or uncatalogued model
 * records tokens with a null cost rather than a guessed one. Fire-and-forget:
 * a logging failure must never break the chat response the user is actually
 * waiting on, same posture as `logEvent`.
 */
export async function logUsageEvent(input: LogUsageEventInput): Promise<void> {
  try {
    const pricing = await getModelPricing(input.provider, input.model);
    const costUsd = computeCostUsd(input.inputTokens, input.outputTokens, pricing);
    await createUsageEvent({
      userId: input.userId,
      agentId: input.agentId,
      conversationId: input.conversationId,
      source: input.source,
      provider: input.provider,
      model: input.model,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      costUsd,
    });
  } catch (err) {
    console.error(`Failed to log usage event for agent "${input.agentId}":`, err);
  }
}
