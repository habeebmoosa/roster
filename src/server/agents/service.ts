import type { LanguageModel } from "ai";
import { type AgentDefinition, type AgentMessage, runAgent } from "@/core/agent";
import { getAgentDefinition, listAgentSummaries } from "@/server/db/repositories/agent.repository";
import { listEpisodicMemories } from "@/server/db/repositories/episodic-memory.repository";
import { getEmbeddingResolveInputForUser, getModelForUser } from "@/server/providers/service";
import { retrieveGroundingContext } from "@/server/retrieval/grounding";

export class AgentNotFoundError extends Error {
  constructor(agentId: string) {
    super(`Agent not found: ${agentId}`);
    this.name = "AgentNotFoundError";
  }
}

export { listAgentSummaries };

export interface StreamAgentChatInput {
  userId: string;
  agentId: string;
  provider: string;
  model: string;
  messages: AgentMessage[];
}

/**
 * Retrieve grounding context for the agent's knowledge base, if it has one.
 * Degrades gracefully (returns undefined) rather than blocking the chat: a
 * BYOK gap (no embedding-capable provider connected) or a transient
 * retrieval failure shouldn't take down an otherwise-working conversation.
 */
async function tryRetrieveGroundingContext(
  input: StreamAgentChatInput,
  definition: AgentDefinition,
  model: LanguageModel,
): Promise<string | undefined> {
  const hasKnowledge =
    definition.memory.semantic.length > 0 || definition.memory.procedural.length > 0;
  if (!hasKnowledge) return undefined;

  const lastUserMessage = [...input.messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) return undefined;

  try {
    const embedInput = await getEmbeddingResolveInputForUser(input.userId);
    const assembled = await retrieveGroundingContext({
      agentId: input.agentId,
      query: lastUserMessage.content,
      embedInput,
      model,
      budgetTokens: definition.context_budget_tokens,
    });
    return assembled.text || undefined;
  } catch (err) {
    console.error(
      `Retrieval failed for agent "${input.agentId}", continuing without grounding:`,
      err,
    );
    return undefined;
  }
}

/**
 * Orchestrates a single agent turn for a user: load the definition, resolve
 * the user's chosen model (BYOK), retrieve grounding context and episodic
 * memory if the agent has any, and stream through the core `runAgent()`.
 * Provider issues surface as ByokError (mapped by the caller); a missing
 * agent throws {@link AgentNotFoundError}.
 */
export async function streamAgentChat(input: StreamAgentChatInput) {
  const definition = await getAgentDefinition(input.agentId);
  if (!definition) throw new AgentNotFoundError(input.agentId);

  const model = await getModelForUser(input.userId, input.provider, input.model);

  const [retrievedContext, episodicMemory] = await Promise.all([
    tryRetrieveGroundingContext(input, definition, model),
    listEpisodicMemories(input.userId, input.agentId),
  ]);

  return runAgent({
    definition,
    model,
    messages: input.messages,
    retrievedContext,
    episodicMemory,
  });
}
