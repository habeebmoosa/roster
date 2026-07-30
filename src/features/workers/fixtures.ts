import { hashString } from "@/lib/hash";
import type { WorkerRow } from "./types";

/**
 * Fixtures for metrics we don't track yet (model, conversations, activity,
 * spend). Deterministic per agent id (a stable hash), so every future agent
 * gets plausible-looking numbers with zero fixture maintenance — no
 * per-agent entries to keep in sync as employees are added in Phase 9.
 */
const FIXTURE_MODELS = ["gpt-4o-mini", "claude-sonnet-5", "gemini-2.0-flash"];
const FIXTURE_ACTIVITY = ["12m ago", "1h ago", "3h ago", "Yesterday", "2d ago"];

export function fixtureMetricsForAgent(
  agentId: string,
): Pick<WorkerRow, "model" | "conversations30d" | "lastActivity" | "spendUsd"> {
  const hash = hashString(agentId);
  return {
    model: FIXTURE_MODELS[hash % FIXTURE_MODELS.length]!,
    conversations30d: 3 + (hash % 60),
    lastActivity: FIXTURE_ACTIVITY[(hash >> 3) % FIXTURE_ACTIVITY.length]!,
    spendUsd: 4 + (hash % 42),
  };
}

export const FIXTURE_CONVERSATIONS_30D_TOTAL = 128;
export const FIXTURE_SPEND_THIS_MONTH_USD = 86.4;
