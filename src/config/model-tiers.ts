/**
 * The three model tiers every employee is validated against (MVP-Plan §7).
 * The eval harness (Phase 5) runs each employee across all three; a change
 * ships only if success rate holds or improves on every tier.
 */
export const MODEL_TIERS = ["frontier", "mid", "cheap"] as const;

export type ModelTier = (typeof MODEL_TIERS)[number];

/** USD per 1M tokens — input and output are priced separately (often 5x apart). */
export interface ModelPricing {
  inputPerMTok: number;
  outputPerMTok: number;
}

export interface ModelTierDefault {
  provider: string;
  model: string;
  pricing: ModelPricing;
}

/**
 * Zero-friction defaults so `npm run eval` reports cost from the first run
 * with just an API key per tier — no need to configure provider/model first.
 * All Anthropic, since that's the pricing we can verify and keep current;
 * override PROVIDER/MODEL per tier (see scripts/eval.ts) to point a tier at
 * any other BYOK provider. Cost is only computed automatically when the
 * resolved provider/model still match these defaults — an overridden model
 * needs its own EVAL_<TIER>_INPUT_PRICE_PER_MTOK/_OUTPUT_PRICE_PER_MTOK, or
 * cost simply isn't reported for that tier (never guessed from a mismatched
 * price table).
 */
export const MODEL_TIER_DEFAULTS: Record<ModelTier, ModelTierDefault> = {
  frontier: {
    provider: "anthropic",
    model: "claude-opus-5",
    pricing: { inputPerMTok: 5, outputPerMTok: 25 },
  },
  mid: {
    provider: "anthropic",
    model: "claude-sonnet-5",
    pricing: { inputPerMTok: 3, outputPerMTok: 15 },
  },
  cheap: {
    provider: "anthropic",
    model: "claude-haiku-4-5",
    pricing: { inputPerMTok: 1, outputPerMTok: 5 },
  },
};
