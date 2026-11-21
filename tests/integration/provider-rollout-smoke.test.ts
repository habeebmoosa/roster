import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { streamCompletion } from "@/core/providers";
import { prisma } from "@/server/db/prisma";
import { addProviderKey, getResolveInputForUser } from "@/server/providers/service";
import { startMockOpenAIServer, type MockServer } from "../helpers/mock-openai-server";

/**
 * docs/plans/LLM_PROVIDER_MVP_PLAN.md Phase 6: "each addition: catalog entry + registry
 * case + a validation smoke test." Catalog entries and registry cases for
 * every provider landed in Phases 2–3; provider-byok.test.ts already proved
 * one native-kind provider (fireworks) end to end. This proves the rest of
 * the OpenAI-compatible-wire-format providers — a real add → validate →
 * stream round trip through our actual registry + service layer, not just
 * that resolveModel() builds an object (registry.test.ts already covers that).
 *
 * Deliberately excluded: Azure, AWS Bedrock, Google Vertex (SigV4 signing /
 * service-account JWT / resource+deployment routing — genuinely different
 * wire protocols a generic OpenAI-compatible mock can't stand in for) and
 * Cohere (its own v2 chat API shape, not /chat/completions). Phase 2's
 * structural tests (resolves to an object; missing_required_field on bad
 * config) are the appropriate ceiling for those four.
 */
const API_KEY = "test-key-123";
let mock: MockServer;
let userId: string;

beforeAll(async () => {
  mock = await startMockOpenAIServer({ apiKey: API_KEY });
  const user = await prisma.user.create({
    data: { email: `provider-rollout-${Date.now()}@test.local` },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  await mock.close();
  await prisma.$disconnect();
});

const OPENAI_COMPATIBLE_WIRE_PROVIDERS = [
  "perplexity",
  "cerebras",
  "deepinfra",
  "nvidia-nim",
  "openrouter",
  "huggingface",
  "groq",
  "deepseek",
  "mistral",
  "together",
  "xai",
];

describe.each(OPENAI_COMPATIBLE_WIRE_PROVIDERS)("%s — live rollout smoke test", (provider) => {
  it("adds, validates, and streams a real completion through the mock server", async () => {
    await addProviderKey({
      userId,
      provider,
      apiKey: API_KEY,
      model: "mock-model",
      baseUrl: mock.url,
      label: `${provider}-smoke`,
    });

    const input = await getResolveInputForUser(userId, provider, "mock-model");
    const result = streamCompletion(input, "hello");

    let text = "";
    for await (const chunk of result.textStream) text += chunk;
    expect(text).toBe("Hello world");
  });
});

describe("ollama — the one genuinely no-key provider", () => {
  it("adds a credential with no secret at all, and it still validates and streams", async () => {
    // A real Ollama instance ignores whatever bearer value it's sent — model
    // this mock server the same way rather than reusing the strict-auth
    // `mock` above, which would require an exact (and meaningless, for
    // Ollama) API key match.
    const ollamaMock = await startMockOpenAIServer();
    try {
      await addProviderKey({
        userId,
        provider: "ollama",
        model: "llama3.3",
        baseUrl: ollamaMock.url,
        label: "local",
      });

      const input = await getResolveInputForUser(userId, "ollama", "llama3.3");
      expect(input.apiKey).toBe("");

      const result = streamCompletion(input, "hello");
      let text = "";
      for await (const chunk of result.textStream) text += chunk;
      expect(text).toBe("Hello world");
    } finally {
      await ollamaMock.close();
    }
  });
});
