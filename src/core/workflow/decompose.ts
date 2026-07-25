import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";

export interface WorkflowStep {
  /** 1-indexed position in the plan, assigned mechanically (never trusted from the model). */
  index: number;
  /** A concise, self-contained description of what this step must accomplish. */
  goal: string;
  /** Whether this step should attempt retrieval/grounding before executing. */
  needsRetrieval: boolean;
}

export interface WorkflowPlan {
  steps: WorkflowStep[];
}

const workflowStepSchema = z.object({
  goal: z
    .string()
    .min(1)
    .describe(
      "A concise, self-contained description of what this step must accomplish. It will be executed independently, without seeing the original planning instructions.",
    ),
  needsRetrieval: z
    .boolean()
    .describe(
      "True only if this step needs to look up specific facts, policies, or documented information to answer accurately.",
    ),
});

const workflowPlanSchema = z.object({
  steps: z
    .array(workflowStepSchema)
    .min(1)
    .describe(
      "Ordered sub-steps needed to fully address the task. Return exactly ONE step for requests simple enough to answer directly — do not split a trivial task just to produce multiple steps.",
    ),
});

function buildDecomposePrompt(task: string, agentContext?: string): string {
  const lines = [
    "You are planning how to complete a task by breaking it into the minimum number of verifiable sub-steps.",
    "",
    `Task: "${task}"`,
  ];

  if (agentContext) {
    lines.push("", `Context about the agent completing this task: ${agentContext}`);
  }

  lines.push(
    "",
    "Rules:",
    "- If the task is simple enough to answer directly in one pass, return exactly ONE step whose goal restates the task. This is the common case — do not decompose simple requests.",
    "- Only produce multiple steps when the task genuinely requires distinct, sequential sub-tasks that each need their own focused attention.",
    "- Each step's goal must be concise and self-contained.",
  );

  return lines.join("\n");
}

/** Assigns mechanical 1-indexed positions — the model's own step order, not a model-supplied index. */
function normalizePlan(raw: z.infer<typeof workflowPlanSchema>): WorkflowPlan {
  return {
    steps: raw.steps.map((step, i) => ({
      index: i + 1,
      goal: step.goal,
      needsRetrieval: step.needsRetrieval,
    })),
  };
}

/** A single-step plan matching the pre-Phase-8 shape: the whole task, retrieval on (safe default). */
function singleStepFallback(task: string): WorkflowPlan {
  return { steps: [{ index: 1, goal: task, needsRetrieval: true }] };
}

export interface DecomposeInput {
  task: string;
  model: LanguageModel;
  /** Optional free-text hints (role, expertise, abilities) to guide step planning. */
  agentContext?: string;
}

/**
 * Break a task into verifiable sub-steps via structured output (same
 * generateObject technique as the Phase 7 re-ranker). A model that fails to
 * produce a valid plan doesn't block the turn — it falls back to a
 * single-step plan, which the workflow bypass then handles exactly like the
 * pre-Phase-8 flow.
 */
export async function decomposeTask(input: DecomposeInput): Promise<WorkflowPlan> {
  const { task, model, agentContext } = input;

  try {
    const result = await generateObject({
      model,
      schema: workflowPlanSchema,
      prompt: buildDecomposePrompt(task, agentContext),
    });
    return normalizePlan(result.object);
  } catch {
    return singleStepFallback(task);
  }
}

/**
 * The single-step bypass check: a zero-extra-call branch on output the
 * decomposer already produced (MVP-Plan §8) — not a second classifier call.
 */
export function isSingleStepPlan(plan: WorkflowPlan): boolean {
  return plan.steps.length === 1;
}
