export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentOption {
  id: string;
  name: string;
  role: string;
}

/** A past conversation shown in the History drawer — fixture until Phase 10 persistence. */
export interface ConversationSummary {
  id: string;
  employeeId: string;
  employeeName: string;
  title: string;
  date: string;
}
