import type { streamText } from "ai";

/**
 * Which models can actually be asked to think out loud, and how to ask them
 * to. Anthropic and OpenAI both hard-reject their thinking/reasoning-effort
 * param on a model that doesn't support it (a 400, not a silent no-op) — so
 * this can't be "just always set it and let the provider ignore what it
 * doesn't understand." Every provider/model not listed here (including every
 * open-weight/BYOK-compatible model this platform is built around) gets no
 * reasoning param at all, exactly today's behavior.
 */

/** Matches `streamText`'s own `providerOptions` param type — derived rather than importing `@ai-sdk/provider-utils` directly, since that package is only a transitive dependency of `ai`. */
type ProviderOptions = NonNullable<Parameters<typeof streamText>[0]["providerOptions"]>;

const REASONING_BUDGET_TOKENS = 4096;

const ANTHROPIC_REASONING_MODEL = /claude-(3-7-sonnet|sonnet-[4-9]|opus-[4-9])/i;
const OPENAI_REASONING_MODEL = /^(o[1-9]|gpt-5)/i;
const GOOGLE_REASONING_MODEL = /^gemini-2\.5/i;

/**
 * Provider-specific `providerOptions` to enable extended thinking/reasoning
 * for a known reasoning-capable model, or `undefined` when this
 * provider/model combination doesn't support it (the safe default).
 */
export function resolveReasoningOptions(
  providerId: string,
  modelId: string,
): ProviderOptions | undefined {
  switch (providerId) {
    case "anthropic":
      return ANTHROPIC_REASONING_MODEL.test(modelId)
        ? { anthropic: { thinking: { type: "enabled", budgetTokens: REASONING_BUDGET_TOKENS } } }
        : undefined;
    case "openai":
      return OPENAI_REASONING_MODEL.test(modelId)
        ? { openai: { reasoningEffort: "medium" } }
        : undefined;
    case "google":
      return GOOGLE_REASONING_MODEL.test(modelId)
        ? {
            google: {
              thinkingConfig: { includeThoughts: true, thinkingBudget: REASONING_BUDGET_TOKENS },
            },
          }
        : undefined;
    default:
      return undefined;
  }
}
