import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { AgentNotFoundError, streamAgentChat } from "@/server/agents/service";
import { prisma } from "@/server/db/prisma";
import { upsertAgent } from "@/server/db/repositories/agent.repository";
import { addProviderKey } from "@/server/providers/service";
import { startMockOpenAIServer, type MockServer } from "../helpers/mock-openai-server";

/**
 * runAgent() end-to-end (offline): load the definition, resolve a BYOK model,
 * and stream through streamAgentChat against a mock provider. Also asserts the
 * persona system prompt actually reaches the provider.
 */
const API_KEY = "test-key-123";
let mock: MockServer;
let userId: string;

beforeAll(async () => {
  mock = await startMockOpenAIServer({ apiKey: API_KEY });
  await upsertAgent(loadAgentDefinitionFile("agents/customer-support/agent.yaml"));
  const user = await prisma.user.create({ data: { email: `agent-${Date.now()}@test.local` } });
  userId = user.id;
  await addProviderKey({
    userId,
    provider: "custom",
    apiKey: API_KEY,
    model: "mock-model",
    baseUrl: mock.url,
  });
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  await mock.close();
  await prisma.$disconnect();
});

describe("streamAgentChat (runAgent via mock provider)", () => {
  it("streams a reply and sends the persona system prompt", async () => {
    const result = await streamAgentChat({
      userId,
      agentId: "customer-support",
      provider: "custom",
      model: "mock-model",
      messages: [{ role: "user", content: "I want a refund" }],
    });

    let text = "";
    for await (const chunk of result.textStream) text += chunk;
    expect(text).toBe("Hello world");

    // The last request to the provider must carry the persona system prompt.
    const lastRequest = mock.requests.at(-1);
    const messages = JSON.stringify(lastRequest?.messages ?? []);
    expect(messages).toContain("Ada — Customer Support");
    expect(messages).toContain("I want a refund");
  });

  it("throws AgentNotFoundError for an unknown agent", async () => {
    await expect(
      streamAgentChat({
        userId,
        agentId: "does-not-exist",
        provider: "custom",
        model: "mock-model",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toBeInstanceOf(AgentNotFoundError);
  });
});
