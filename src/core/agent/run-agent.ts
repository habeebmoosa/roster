import { streamText, type LanguageModel } from "ai";
import {
  decomposeTask,
  isSingleStepPlan,
  runWorkflow,
  type StepRetrieveFn,
  type WorkflowStepEvent,
} from "@/core/workflow";
import type { AgentDefinition } from "./definition";
import { buildSystemPrompt, type EpisodicMemoryEntry } from "./system-prompt";

/** A single turn of working memory (the current session's conversation). */
export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RunAgentUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface RunAgentResult {
  textStream: AsyncIterable<string>;
  text: Promise<string>;
  usage: Promise<RunAgentUsage>;
}

export interface RunAgentInput {
  definition: AgentDefinition;
  model: LanguageModel;
  messages: AgentMessage[];
  /** Assembled, hard-capped grounding text (core/retrieval), if the caller retrieved any. Only used on the single-step bypass path. */
  retrievedContext?: string;
  /** Per-user, per-agent history/preferences (Phase 7 episodic memory), if any. */
  episodicMemory?: EpisodicMemoryEntry[];
  /** Injected per-step retrieval dependency for the multi-step workflow path (Phase 8). Omit when the agent has no knowledge base. */
  retrieve?: StepRetrieveFn;
  /** Model that judges groundedness in the multi-step path — independent of `model`'s own output, never same-model self-critique. Omit to skip that check. */
  groundednessModel?: LanguageModel;
  /** Step-boundary events for the future Phase 10 chat UI to render live progress. */
  onStepEvent?: (event: WorkflowStepEvent) => void;
}

async function* singleChunkStream(text: string): AsyncGenerator<string> {
  yield text;
}

function buildAgentContext(definition: AgentDefinition): string {
  const parts = [`Role: ${definition.role}.`];
  if (definition.expertise.length > 0) {
    parts.push(`Expertise: ${definition.expertise.join(", ")}.`);
  }
  return parts.join(" ");
}

/**
 * The single entry point for running an agent. Decomposes the current turn
 * into a plan (Phase 8); a single-step plan takes the bypass — skip the
 * validate/compress/retry machinery entirely and stream directly, the same
 * shape as pre-Phase-8 — which is the common case for trivial turns and pays
 * for exactly one extra call (the decomposition) over the old behavior. A
 * multi-step plan runs the full workflow loop (core/workflow: execute ->
 * validate -> compress -> retry/rollback) and returns its final, already-
 * validated answer as a resolved single-chunk stream — validated output can't
 * be streamed live while it's still being checked.
 */
export async function runAgent(input: RunAgentInput): Promise<RunAgentResult> {
  const {
    definition,
    model,
    messages,
    retrievedContext,
    episodicMemory,
    retrieve,
    groundednessModel,
    onStepEvent,
  } = input;

  const task = [...messages].reverse().find((m) => m.role === "user")?.content;

  if (task) {
    const plan = await decomposeTask({ task, model, agentContext: buildAgentContext(definition) });

    if (!isSingleStepPlan(plan)) {
      const systemPrompt = buildSystemPrompt(definition, { episodicMemory });
      const workflow = await runWorkflow({
        model,
        plan,
        task,
        systemPrompt,
        contextBudgetTokens: definition.context_budget_tokens,
        retrieve,
        groundednessModel,
        onStepEvent,
      });
      return {
        textStream: singleChunkStream(workflow.text),
        text: Promise.resolve(workflow.text),
        usage: Promise.resolve(workflow.usage),
      };
    }
  }

  const result = streamText({
    model,
    system: buildSystemPrompt(definition, { retrievedContext, episodicMemory }),
    messages,
  });

  return {
    textStream: result.textStream,
    text: Promise.resolve(result.text),
    usage: Promise.resolve(
      result.usage.then((u) => ({
        inputTokens: u.inputTokens ?? 0,
        outputTokens: u.outputTokens ?? 0,
      })),
    ),
  };
}
