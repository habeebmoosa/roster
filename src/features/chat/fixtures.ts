import { hashString } from "@/lib/hash";
import type { AgentOption, ConversationSummary } from "./types";

/**
 * Fixture "past conversations" for the History drawer — real persistence
 * arrives in Phase 10 (Conversation/Message tables). Titles are fixture;
 * the employee name/id are real, so at least half of each row is honest.
 */
const TITLE_TEMPLATES = [
  "Refund for order #48213",
  "Can't log into my account",
  "Question about the return policy",
  "Escalation: repeated billing issue",
  "Follow-up on last week's ticket",
];

const DATES = ["Today", "Yesterday", "3 days ago", "Last week"];

export function fixtureConversationsForAgents(agents: AgentOption[]): ConversationSummary[] {
  return agents.flatMap((agent, agentIndex) => {
    const hash = hashString(agent.id);
    const count = 1 + (hash % 2); // 1 or 2 fixture conversations per employee
    return Array.from({ length: count }, (_, i) => {
      const titleIndex = (hash + agentIndex + i) % TITLE_TEMPLATES.length;
      const dateIndex = (hash + i) % DATES.length;
      return {
        id: `${agent.id}-${i}`,
        employeeId: agent.id,
        employeeName: agent.name,
        title: TITLE_TEMPLATES[titleIndex]!,
        date: DATES[dateIndex]!,
      };
    });
  });
}
