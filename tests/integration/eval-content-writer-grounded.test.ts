import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { runEval } from "@/core/eval";
import { loadEvalSet } from "@/core/eval/loader";
import { getAgentDefinition, upsertAgent } from "@/server/db/repositories/agent.repository";
import { prisma } from "@/server/db/prisma";
import { ingestAgentKnowledge } from "@/server/knowledge/ingest";
import { retrieveGroundingContext } from "@/server/retrieval/grounding";
import { startMockOpenAIServer, type MockServer } from "../helpers/mock-openai-server";
import { MockLanguageModelV4 } from "ai/test";
import type { RetrieveFn } from "@/core/eval";

/**
 * Content-writer sub-phase (9.1) content-correctness proof: ingests the real
 * knowledge/playbooks against the real Phase 7 pipeline (real chunking, real
 * hybrid search, real embeddings via the mock server), then runs every
 * content-writer-grounded.json task with a scripted reply that satisfies its
 * text grader — so a pass proves the *retrieval* half is genuinely correct:
 * each task's expected source uri is the one hybrid search actually surfaces
 * for that query, not just that the model said the right words.
 */
const API_KEY = "test-key-123";
const AGENT_ID = "content-writer";
const AGENT_DIR = `agents/${AGENT_ID}`;
let mock: MockServer;
let embedInput: { provider: string; apiKey: string; baseUrl: string };

const MOCK_FINISH_REASON = { unified: "stop" as const, raw: undefined };
const MOCK_USAGE = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

function scriptedReplyModel(replyText: string): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doStream: {
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: "text-start", id: "1" });
          controller.enqueue({ type: "text-delta", id: "1", delta: replyText });
          controller.enqueue({ type: "text-end", id: "1" });
          controller.enqueue({
            type: "finish",
            finishReason: MOCK_FINISH_REASON,
            usage: MOCK_USAGE,
          });
          controller.close();
        },
      }),
    },
  });
}

/** A scripted reply that satisfies each task's own non-retrieval grader(s). */
const SCRIPTED_REPLIES: Record<string, string> = {
  "seo-meta-description-length": "Meta descriptions should be 150-160 characters long.",
  "blog-post-word-count": "A standard SEO blog post should be roughly 800 to 1500 words.",
  "blog-structure-hook":
    "The opening should hook the reader with a surprising stat, question, or bold claim.",
  "style-guide-oxford-comma": "Yes, we use the Oxford comma in all our writing.",
  "self-edit-checklist-cta":
    "During a self-edit pass, a piece should have exactly one call to action.",
};

beforeAll(async () => {
  mock = await startMockOpenAIServer({ apiKey: API_KEY });
  embedInput = { provider: "openai", apiKey: API_KEY, baseUrl: mock.url };
  await upsertAgent(loadAgentDefinitionFile(`${AGENT_DIR}/agent.yaml`));
  const definition = (await getAgentDefinition(AGENT_ID))!;
  await ingestAgentKnowledge({ definition, agentDir: AGENT_DIR, embedInput });
});

afterAll(async () => {
  await prisma.agentKnowledge.deleteMany({ where: { agentId: AGENT_ID } });
  await mock.close();
  await prisma.$disconnect();
});

describe("eval harness — content-writer grounded tasks (real KB, real retrieval pipeline)", () => {
  const set = loadEvalSet(`evals/${AGENT_ID}-grounded.json`);

  it.each(set.tasks.map((t) => [t.id, t] as const))(
    "%s retrieves the expected source and passes its grader",
    async (taskId, task) => {
      const definition = (await getAgentDefinition(AGENT_ID))!;
      const scriptedReply = SCRIPTED_REPLIES[taskId];
      expect(scriptedReply, `no scripted reply configured for task "${taskId}"`).toBeTruthy();

      const retrieve: RetrieveFn = async (query, model) => {
        const assembled = await retrieveGroundingContext({
          agentId: AGENT_ID,
          query,
          embedInput,
          model,
          budgetTokens: definition.context_budget_tokens,
        });
        return { text: assembled.text, sourceUris: assembled.usedSourceUris };
      };

      const results = await runEval({
        definition,
        tasks: [task],
        tiers: [{ tier: "cheap", modelLabel: "mock", model: scriptedReplyModel(scriptedReply!) }],
        retrieve,
      });

      const caseResult = results[0]!.cases[0]!;
      expect(caseResult.failures, caseResult.failures.join("; ")).toEqual([]);
      expect(caseResult.passed).toBe(true);
    },
  );
});
