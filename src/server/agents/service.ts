import { type AgentMessage, runAgent } from "@/core/agent";
import { getAgentDefinition, listAgentSummaries } from "@/server/db/repositories/agent.repository";
import { getModelForUser } from "@/server/providers/service";

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
 * Orchestrates a single agent turn for a user: load the definition, resolve the
 * user's chosen model (BYOK), and stream through the core `runAgent()`.
 * Provider issues surface as ByokError (mapped by the caller); a missing agent
 * throws {@link AgentNotFoundError}.
 */
export async function streamAgentChat(input: StreamAgentChatInput) {
  const definition = await getAgentDefinition(input.agentId);
  if (!definition) throw new AgentNotFoundError(input.agentId);

  const model = await getModelForUser(input.userId, input.provider, input.model);
  return runAgent({ definition, model, messages: input.messages });
}
