import { streamText, type LanguageModel } from "ai";
import type { AgentDefinition } from "./definition";
import { buildSystemPrompt, type EpisodicMemoryEntry } from "./system-prompt";

/** A single turn of working memory (the current session's conversation). */
export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RunAgentInput {
  definition: AgentDefinition;
  model: LanguageModel;
  messages: AgentMessage[];
  /** Assembled, hard-capped grounding text (core/retrieval), if the caller retrieved any. */
  retrievedContext?: string;
  /** Per-user, per-agent history/preferences (Phase 7 episodic memory), if any. */
  episodicMemory?: EpisodicMemoryEntry[];
}

/**
 * The single entry point for running an agent: build the persona system
 * prompt (folding in retrieval/episodic-memory context when the caller
 * supplies it) and stream a reply over the working-memory messages. Tools and
 * the structured workflow slot in here in later phases — the signature and
 * streaming contract stay stable.
 */
export function runAgent({
  definition,
  model,
  messages,
  retrievedContext,
  episodicMemory,
}: RunAgentInput) {
  return streamText({
    model,
    system: buildSystemPrompt(definition, { retrievedContext, episodicMemory }),
    messages,
  });
}
