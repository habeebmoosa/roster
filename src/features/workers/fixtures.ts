import { hashString } from "@/lib/hash";
import type { WorkerRow } from "./types";

/**
 * Fixtures for metrics we don't track yet (conversations, activity, spend —
 * no usage-tracking pipeline exists until Phase 10/11). Deterministic per
 * agent id (a stable hash), so every future agent gets plausible-looking
 * numbers with zero fixture maintenance. `model` is deliberately NOT here —
 * it's real data now (Agent.definition.model), and a realistic-looking fake
 * model would be indistinguishable from an actually-configured one.
 */
const FIXTURE_ACTIVITY = ["12m ago", "1h ago", "3h ago", "Yesterday", "2d ago"];

export function fixtureMetricsForAgent(
  agentId: string,
): Pick<WorkerRow, "conversations30d" | "lastActivity" | "spendUsd"> {
  const hash = hashString(agentId);
  return {
    conversations30d: 3 + (hash % 60),
    lastActivity: FIXTURE_ACTIVITY[(hash >> 3) % FIXTURE_ACTIVITY.length]!,
    spendUsd: 4 + (hash % 42),
  };
}

export const FIXTURE_CONVERSATIONS_30D_TOTAL = 128;
export const FIXTURE_SPEND_THIS_MONTH_USD = 86.4;
