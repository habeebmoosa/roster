import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadAgentDefinitionFile } from "@/core/agent/loader";
import { upsertAgent } from "@/server/db/repositories/agent.repository";
import { createApiKey, revokeApiKey } from "@/server/db/repositories/api-key.repository";
import { prisma } from "@/server/db/prisma";
import { getRateLimiter } from "@/server/ratelimit";
import { addProviderKey } from "@/server/providers/service";
import { POST } from "@/app/api/v1/agents/[id]/chat/route";
import { startMockOpenAIServer, type MockServer } from "../helpers/mock-openai-server";

/**
 * Full request/response wiring for POST /v1/agents/{id}/chat, hit directly
 * (Next.js route handlers are plain (Request) => Response functions — no
 * running server needed). This is the one route this phase tests directly
 * rather than only its underlying service, since the DoD's 401/404/429/200
 * behaviors live largely in the route itself (auth, rate limit, error
 * mapping), not in a single already-tested service function.
 */
const API_KEY = "test-key-123";
const AGENT_ID = "customer-support";
let mock: MockServer;
let userId: string;
let rawKey: string;

function request(body: unknown, authHeader: string | null): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (authHeader) headers.set("authorization", authHeader);
  return new Request(`http://localhost/api/v1/agents/${AGENT_ID}/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function callRoute(body: unknown, authHeader: string | null, agentId = AGENT_ID) {
  return POST(request(body, authHeader), { params: Promise.resolve({ id: agentId }) });
}

async function readFrames(res: Response): Promise<unknown[]> {
  const text = await res.text();
  return text
    .split("\n\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice("data: ".length))
    .filter((raw) => raw !== "[DONE]")
    .map((raw) => JSON.parse(raw));
}

beforeAll(async () => {
  mock = await startMockOpenAIServer({ apiKey: API_KEY });
  await upsertAgent(loadAgentDefinitionFile(`agents/${AGENT_ID}/agent.yaml`));
  const user = await prisma.user.create({ data: { email: `rest-route-${Date.now()}@test.local` } });
  userId = user.id;
  await addProviderKey({
    userId,
    provider: "custom",
    apiKey: API_KEY,
    model: "mock-model",
    baseUrl: mock.url,
  });
  const created = await createApiKey(userId, "route test key");
  rawKey = created.rawKey;
});

afterAll(async () => {
  await prisma.apiKey.deleteMany({ where: { userId } });
  await prisma.providerKey.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await mock.close();
  await prisma.$disconnect();
});

describe("POST /v1/agents/{id}/chat", () => {
  it("401s with no Authorization header", async () => {
    const res = await callRoute({ messages: [{ role: "user", content: "hi" }] }, null);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("unauthorized");
  });

  it("401s with an unknown key", async () => {
    const res = await callRoute(
      { messages: [{ role: "user", content: "hi" }] },
      "Bearer rk_live_not-a-real-key",
    );
    expect(res.status).toBe(401);
  });

  it("401s with a revoked key", async () => {
    const created = await createApiKey(userId, "to be revoked");
    await revokeApiKey(userId, created.summary.id);
    const res = await callRoute(
      { messages: [{ role: "user", content: "hi" }] },
      `Bearer ${created.rawKey}`,
    );
    expect(res.status).toBe(401);
  });

  it("404s for an unknown agent", async () => {
    const res = await callRoute(
      { messages: [{ role: "user", content: "hi" }], provider: "custom", model: "mock-model" },
      `Bearer ${rawKey}`,
      "does-not-exist",
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("agent_not_found");
  });

  it("400s on a malformed body", async () => {
    const res = await callRoute({ messages: [] }, `Bearer ${rawKey}`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("bad_request");
  });

  it("400s when neither the caller nor the agent specifies a model", async () => {
    // customer-support's seeded YAML has no default `model`.
    const res = await callRoute(
      { messages: [{ role: "user", content: "hi" }] },
      `Bearer ${rawKey}`,
    );
    expect(res.status).toBe(400);
  });

  it("streams a reply for a valid key with an explicit provider/model", async () => {
    const res = await callRoute(
      {
        messages: [{ role: "user", content: "I want a refund" }],
        provider: "custom",
        model: "mock-model",
      },
      `Bearer ${rawKey}`,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const frames = await readFrames(res);
    const text = frames.map((f) => (f as { content: string }).content).join("");
    expect(text).toBe("Hello world");
  });

  it("streams a reply using a per-request key without ever storing it", async () => {
    const freshUser = await prisma.user.create({
      data: { email: `rest-route-ephemeral-${Date.now()}@test.local` },
    });
    const created = await createApiKey(freshUser.id, "ephemeral test key");

    try {
      const res = await callRoute(
        {
          messages: [{ role: "user", content: "hi" }],
          provider: "custom",
          model: "mock-model",
          apiKey: API_KEY,
          baseUrl: mock.url,
        },
        `Bearer ${created.rawKey}`,
      );
      expect(res.status).toBe(200);
      const frames = await readFrames(res);
      const text = frames.map((f) => (f as { content: string }).content).join("");
      expect(text).toBe("Hello world");

      const storedKeys = await prisma.providerKey.findMany({ where: { userId: freshUser.id } });
      expect(storedKeys).toHaveLength(0);
    } finally {
      await prisma.apiKey.deleteMany({ where: { userId: freshUser.id } });
      await prisma.user.delete({ where: { id: freshUser.id } });
    }
  });

  it("429s once the per-user rate limit is exceeded", async () => {
    const rateLimitedUser = await prisma.user.create({
      data: { email: `rest-route-ratelimit-${Date.now()}@test.local` },
    });
    const created = await createApiKey(rateLimitedUser.id, "rate limit test key");

    try {
      const limiter = getRateLimiter();
      let last = await limiter.check(rateLimitedUser.id);
      while (last.allowed) {
        last = await limiter.check(rateLimitedUser.id);
      }

      const res = await callRoute(
        {
          messages: [{ role: "user", content: "hi" }],
          provider: "custom",
          model: "mock-model",
        },
        `Bearer ${created.rawKey}`,
      );
      expect(res.status).toBe(429);
      expect(res.headers.get("retry-after")).not.toBeNull();
      const body = await res.json();
      expect(body.error.code).toBe("rate_limited");
    } finally {
      await prisma.apiKey.deleteMany({ where: { userId: rateLimitedUser.id } });
      await prisma.user.delete({ where: { id: rateLimitedUser.id } });
    }
  });
});
