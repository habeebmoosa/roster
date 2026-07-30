import type { LanguageModel, Tool } from "ai";
import { type AgentDefinition, type AgentMessage, runAgent } from "@/core/agent";
import { resolveModel } from "@/core/providers";
import { resolveBuiltInTools } from "@/core/tools";
import type { WorkflowStepEvent } from "@/core/workflow";
import { getAgentDefinition, listAgentSummaries } from "@/server/db/repositories/agent.repository";
import { listEpisodicMemories } from "@/server/db/repositories/episodic-memory.repository";
import { resolveMcpToolsForAgent } from "@/server/mcp/agent-tools-service";
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
  /** Step-boundary events for the chat UI to render live (Phase 11.4) — only fires on the multi-step workflow path. */
  onStepEvent?: (event: WorkflowStepEvent) => void;
  /**
   * REST API only (Phase 12.2): resolve the model from this caller-supplied
   * key instead of a stored provider key. Never persisted anywhere — it lives
   * only for the duration of this call.
   */
  ephemeralKey?: { apiKey: string; baseUrl?: string };
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
 * Merges this agent's built-in tools (from `abilities`, purely local — see
 * core/tools/registry.ts) with any MCP servers the user has both connected
 * and enabled for it (server/mcp/agent-tools-service.ts). Built-in resolution
 * can't fail; MCP resolution already degrades a single bad connector away
 * rather than throwing, so this never blocks a turn.
 */
async function resolveToolsForAgent(
  userId: string,
  agentId: string,
  definition: AgentDefinition,
): Promise<Record<string, Tool>> {
  const mcpTools = await resolveMcpToolsForAgent(userId, agentId);
  return { ...resolveBuiltInTools(definition.abilities), ...mcpTools };
}

/**
 * Orchestrates a single agent turn for a user: load the definition, resolve
 * the user's chosen model (BYOK), retrieve grounding context and episodic
 * memory if the agent has any, resolve its built-in + MCP tools, and stream
 * through the core `runAgent()`. Provider issues surface as ByokError (mapped
 * by the caller); a missing agent throws {@link AgentNotFoundError}.
 */
export async function streamAgentChat(input: StreamAgentChatInput) {
  const definition = await getAgentDefinition(input.agentId);
  if (!definition) throw new AgentNotFoundError(input.agentId);

  const model = input.ephemeralKey
    ? resolveModel({
        provider: input.provider,
        model: input.model,
        apiKey: input.ephemeralKey.apiKey,
        baseUrl: input.ephemeralKey.baseUrl ?? null,
      })
    : await getModelForUser(input.userId, input.provider, input.model);

  const [retrievedContext, episodicMemory, tools] = await Promise.all([
    tryRetrieveGroundingContext(input, definition, model),
    listEpisodicMemories(input.userId, input.agentId),
    resolveToolsForAgent(input.userId, input.agentId, definition),
  ]);

  return runAgent({
    definition,
    model,
    messages: input.messages,
    retrievedContext,
    episodicMemory,
    tools,
    onStepEvent: input.onStepEvent,
  });
}
