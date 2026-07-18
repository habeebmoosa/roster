import { streamText, type LanguageModel } from "ai";
import type { AgentDefinition } from "./definition";
import { buildSystemPrompt } from "./system-prompt";

/** A single turn of working memory (the current session's conversation). */
export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RunAgentInput {
  definition: AgentDefinition;
  model: LanguageModel;
  messages: AgentMessage[];
}

/**
 * The single entry point for running an agent. Phase 4 skeleton: build the
 * persona system prompt and stream a reply over the working-memory messages.
 * Retrieval, tools, and the structured workflow slot in here in later phases —
 * the signature and streaming contract stay stable.
 */
export function runAgent({ definition, model, messages }: RunAgentInput) {
  return streamText({
    model,
    system: buildSystemPrompt(definition),
    messages,
  });
}
