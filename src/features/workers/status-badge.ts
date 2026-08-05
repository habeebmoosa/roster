import type { AgentStatus } from "@/server/db/repositories/agent.repository";
import type { BadgeVariant } from "@/ui";

const STATUS_BADGE: Record<AgentStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: "Active", variant: "success" },
  paused: { label: "Paused", variant: "neutral" },
};

/** The display label + badge variant for an agent's real pause state. */
export function agentStatusBadge(status: AgentStatus): { label: string; variant: BadgeVariant } {
  return STATUS_BADGE[status];
}
