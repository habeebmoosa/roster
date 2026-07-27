export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentOption {
  id: string;
  name: string;
  role: string;
}

/** A past conversation shown in the History drawer — real since Phase 11 (server/db/repositories/conversation.repository.ts). */
export interface ConversationSummary {
  id: string;
  employeeId: string;
  employeeName: string;
  title: string;
  date: string;
}
