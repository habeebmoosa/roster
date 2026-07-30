import type { WorkflowStepEvent } from "@/core/workflow";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Phase 8 step-boundary events for this turn (multi-step workflow path only) — rendered live, then persisted for reload (11.4). */
  stepEvents?: WorkflowStepEvent[];
  /** A structured, in-thread failure for this turn (11.4) — never text spliced into `content`. */
  error?: string;
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
