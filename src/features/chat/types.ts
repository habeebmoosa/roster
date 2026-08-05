import type { MessagePart } from "@/core/agent";
import type { WorkflowStepEvent } from "@/core/workflow";

export interface ChatMessage {
  role: "user" | "assistant";
  /** User bubble text, or — on an assistant turn — a convenience mirror of the accumulated text parts. Rendering should prefer `parts` once it's populated; this stays around for turns that predate it and as a plain-text fallback. */
  content: string;
  /** Ordered text/reasoning/tool-call blocks for an assistant turn (chat streaming UX follow-up) — undefined for a user turn, and for any assistant turn that predates this field (falls back to rendering `content` as a single text part). */
  parts?: MessagePart[];
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
