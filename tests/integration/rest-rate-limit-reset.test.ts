import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { upsertAgent } from "@/server/db/repositories/agent.repository";
import { createApiKey } from "@/server/db/repositories/api-key.repository";
import { prisma } from "@/server/db/prisma";
import { addProviderKey } from "@/server/providers/service";
import { startMockOpenAIServer, type MockServer } from "../helpers/mock-openai-server";

/**
 * Phase 12's DoD says the rate limit both "enforces AND resets" — the
 * enforcement half is covered by rest-chat-route.test.ts's 429 case, but
 * that test uses the real 60-req/minute default, too slow to wait out here.
 * This isolates the reset behavior with a tiny window via a mocked limiter,
 * kept in its own file since vi.mock is file-wide and would otherwise change
 * the limiter every other route test observes too.
 *
 * The factory builds its own single shared limiter instance (rather than
 * returning a fresh one per call) — getRateLimiter() is normally a cached
 * singleton, and a factory that returns `new MemoryRateLimiter(...)` on every
 * invocation would silently reset the count on every request, never blocking.
 */
// Generous relative to real request overhead (agent lookup, model call,
// Prisma writes) so the window doesn't race ahead of the two calls under load
// — a 50ms window flaked when run alongside the rest of the integration suite.
const { WINDOW_MS } = vi.hoisted(() => ({ WINDOW_MS: 1000 }));
vi.mock("@/server/ratelimit", async () => {
  const { MemoryRateLimiter } = await import("@/server/ratelimit/memory-limiter");
  const limiter = new MemoryRateLimiter(1, WINDOW_MS);
  return { getRateLimiter: () => limiter };
});

const API_KEY = "test-key-123";
const AGENT_ID = "customer-support";
let mock: MockServer;
let userId: string;
let rawKey: string;

beforeAll(async () => {
  mock = await startMockOpenAIServer({ apiKey: API_KEY });
  await upsertAgent(loadAgentDefinitionFile(`agents/${AGENT_ID}/agent.yaml`));
  const user = await prisma.user.create({
    data: { email: `rest-ratelimit-reset-${Date.now()}@test.local` },
  });
  userId = user.id;
  await addProviderKey({
    userId,
    provider: "custom",
    apiKey: API_KEY,
    model: "mock-model",
    baseUrl: mock.url,
  });
  const created = await createApiKey(userId, "reset test key");
  rawKey = created.rawKey;
});

afterAll(async () => {
  await prisma.apiKey.deleteMany({ where: { userId } });
  await prisma.providerKey.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await mock.close();
  await prisma.$disconnect();
});

function callRoute() {
  const headers = new Headers({
    "content-type": "application/json",
    authorization: `Bearer ${rawKey}`,
  });
  const req = new Request(`http://localhost/api/v1/agents/${AGENT_ID}/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      messages: [{ role: "user", content: "hi" }],
      provider: "custom",
      model: "mock-model",
    }),
  });
  return import("@/app/api/v1/agents/[id]/chat/route").then(({ POST }) =>
    POST(req, { params: Promise.resolve({ id: AGENT_ID }) }),
  );
}

describe("rate limit reset (route-level)", () => {
  it("blocks once the window's single request is used, then allows again after it resets", async () => {
    const first = await callRoute();
    expect(first.status).toBe(200);
    await first.text(); // drain the SSE body so the stream finishes cleanly

    const second = await callRoute();
    expect(second.status).toBe(429);

    await new Promise((resolve) => setTimeout(resolve, WINDOW_MS + 20));

    const third = await callRoute();
    expect(third.status).toBe(200);
    await third.text();
  });
});
