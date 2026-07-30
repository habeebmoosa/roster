import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { getAgentDefinition, upsertAgent } from "@/server/db/repositories/agent.repository";
import { upsertEpisodicMemory } from "@/server/db/repositories/episodic-memory.repository";
import { prisma } from "@/server/db/prisma";
import { streamAgentChat } from "@/server/agents/service";
import { ingestAgentKnowledge } from "@/server/knowledge/ingest";
import { addProviderKey } from "@/server/providers/service";
import { startMockOpenAIServer, type MockServer } from "../helpers/mock-openai-server";

/**
 * The whole Phase 7 pipeline, wired into the real chat entry point
 * (streamAgentChat -> runAgent): retrieval grounds the reply, episodic
 * memory surfaces into the prompt, and a BYOK gap degrades gracefully
 * rather than breaking chat.
 *
 * Note: the shared mock chat server returns plain text, not a structured
 * JSON object, so the re-ranker's generateObject call falls back to hybrid
 * search's own (RRF) order here rather than exercising genuine LLM
 * reordering — that's exactly the fallback path 7.4's rerank.test.ts already
 * covers with the right tool (MockLanguageModelV4). This file's job is
 * proving the wiring (retrieval -> grounding -> episodic memory -> the real
 * chat entry point), not re-proving reranker judgment.
 */
const API_KEY = "test-key-123";
const AGENT_ID = "customer-support";
const AGENT_DIR = `agents/${AGENT_ID}`;
let mock: MockServer;
let userId: string;

beforeAll(async () => {
  mock = await startMockOpenAIServer({ apiKey: API_KEY });
  await upsertAgent(loadAgentDefinitionFile(`${AGENT_DIR}/agent.yaml`));

  const user = await prisma.user.create({
    data: { email: `retrieval-chat-${Date.now()}@test.local` },
  });
  userId = user.id;

  // Chat provider — what streamAgentChat's provider/model params select.
  await addProviderKey({
    userId,
    provider: "custom",
    apiKey: API_KEY,
    model: "mock-model",
    baseUrl: mock.url,
  });
  // Embedding-capable provider (openai kind), same mock endpoint.
  await addProviderKey({
    userId,
    provider: "openai",
    apiKey: API_KEY,
    model: "mock-model",
    baseUrl: mock.url,
  });

  const definition = (await getAgentDefinition(AGENT_ID))!;
  await ingestAgentKnowledge({
    definition,
    agentDir: AGENT_DIR,
    embedInput: { provider: "openai", apiKey: API_KEY, baseUrl: mock.url },
  });
});

afterAll(async () => {
  await prisma.agentKnowledge.deleteMany({ where: { agentId: AGENT_ID } });
  await prisma.episodicMemory.deleteMany({ where: { userId } });
  await prisma.providerKey.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  await mock.close();
  await prisma.$disconnect();
});

describe("streamAgentChat with retrieval wired in", () => {
  it("grounds the reply with retrieved knowledge for a matching query", async () => {
    const result = await streamAgentChat({
      userId,
      agentId: AGENT_ID,
      provider: "custom",
      model: "mock-model",
      messages: [{ role: "user", content: "What is your refund policy?" }],
    });
    let text = "";
    for await (const chunk of result.textStream) text += chunk;
    expect(text).toBe("Hello world");

    const lastRequest = mock.requests.at(-1);
    const systemMessage = JSON.stringify(lastRequest?.messages ?? []);
    expect(systemMessage).toContain("Reference material");
    expect(systemMessage.toLowerCase()).toContain("refund");
  });

  it("surfaces episodic memory into the system prompt", async () => {
    await upsertEpisodicMemory(userId, AGENT_ID, "preference:tone", "prefers very short replies");

    const result = await streamAgentChat({
      userId,
      agentId: AGENT_ID,
      provider: "custom",
      model: "mock-model",
      messages: [{ role: "user", content: "Hi" }],
    });
    let text = "";
    for await (const chunk of result.textStream) text += chunk;
    expect(text).toBe("Hello world");

    const lastRequest = mock.requests.at(-1);
    const systemMessage = JSON.stringify(lastRequest?.messages ?? []);
    expect(systemMessage).toContain("What you remember about this user");
    expect(systemMessage).toContain("prefers very short replies");
  });

  it("degrades gracefully (chat still works, no grounding) with no embedding-capable provider", async () => {
    await prisma.providerKey.deleteMany({ where: { userId, provider: "openai" } });

    const result = await streamAgentChat({
      userId,
      agentId: AGENT_ID,
      provider: "custom",
      model: "mock-model",
      messages: [{ role: "user", content: "What is your refund policy?" }],
    });
    let text = "";
    for await (const chunk of result.textStream) text += chunk;
    expect(text).toBe("Hello world");

    const lastRequest = mock.requests.at(-1);
    expect(JSON.stringify(lastRequest?.messages ?? [])).not.toContain("Reference material");
  });
});
