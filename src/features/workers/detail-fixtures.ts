import { hashString } from "@/lib/hash";
import type { WorkerDetailFixtures } from "./detail-types";

const ACTIVITY_TEMPLATES = [
  "Resolved a refund request",
  "De-escalated an angry customer",
  "Answered a policy question",
  "Escalated to a human",
  "Drafted a reply",
];

export function detailFixturesForAgent(agentId: string): WorkerDetailFixtures {
  const hash = hashString(agentId);

  // (hash + i) mod 5 for i=0,1,2 are always 3 distinct values mod 5, so the
  // three activity entries never repeat the same template.
  const recentActivity = Array.from({ length: 3 }, (_, i) => {
    const templateIndex = (hash + i) % ACTIVITY_TEMPLATES.length;
    return {
      text: ACTIVITY_TEMPLATES[templateIndex]!,
      time: ["12m ago", "1h ago", "Yesterday"][i]!,
    };
  });

  return {
    status: "Active",
    conversations30d: 3 + (hash % 60),
    spend30dUsd: 4 + (hash % 42),
    tokens30dLabel: `${(1 + (hash % 30) / 10).toFixed(1)}M`,
    uptimePct: 99 + (hash % 10) / 10,
    recentActivity,
  };
}
