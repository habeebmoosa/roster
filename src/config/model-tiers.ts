/**
 * The three model tiers every employee is validated against (MVP-Plan §7).
 * The eval harness (Phase 5) runs each employee across all three; a change
 * ships only if success rate holds or improves on every tier.
 */
export const MODEL_TIERS = ["frontier", "mid", "cheap"] as const;

export type ModelTier = (typeof MODEL_TIERS)[number];
