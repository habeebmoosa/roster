import { generateKeyPairSync } from "node:crypto";
import nock from "nock";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db/prisma";
import { addProviderKey, getResolveInputForUser } from "@/server/providers/service";

/**
 * docs/plans/LLM_PROVIDER_MVP_PLAN.md Phase 7: "end-to-end check across at least one
 * provider per credential shape" — the two shapes provider-rollout-smoke.test.ts
 * deliberately left at the structural (registry.test.ts) level: AWS Bedrock's
 * multi-secret SigV4-signed requests, and Google Vertex's service-account JWT
 * flow. Both real wire protocols, so neither fits the shared OpenAI-compatible
 * mock server — each needs its own interception strategy:
 *
 * - Bedrock signs via `aws4fetch`/an inline SigV4 signer that calls the global
 *   `fetch` directly, so `vi.stubGlobal("fetch", ...)` intercepts it — no new
 *   dependency needed, and the mock asserts a real `AWS4-HMAC-SHA256`
 *   Authorization header came through, proving signing actually ran.
 * - Vertex's service-account auth goes through `google-auth-library` ->
 *   `gaxios`, which does its OAuth token exchange via a separately-versioned,
 *   nested copy of `node-fetch` (not the global fetch) — built on Node's
 *   `http`/`https`, which is exactly what `nock` intercepts. The actual
 *   `generateContent` call afterward *does* go through the global fetch, so
 *   that half is covered by the same stub as Bedrock.
 */
describe("amazon-bedrock — live rollout smoke test (multi-secret, AWS SigV4)", () => {
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `bedrock-smoke-${Date.now()}@test.local` },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("signs the request with real SigV4 and validates against a mocked bedrock-runtime response", async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      expect(String(input)).toContain("bedrock-runtime.us-east-1.amazonaws.com");
      expect(String(input)).toContain("/converse");
      const authHeader = new Headers(init?.headers).get("authorization") ?? "";
      expect(authHeader).toContain("AWS4-HMAC-SHA256");
      return new Response(
        JSON.stringify({
          output: { message: { role: "assistant", content: [{ text: "OK" }] } },
          stopReason: "end_turn",
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await addProviderKey({
      userId,
      provider: "amazon-bedrock",
      secrets: { accessKeyId: "AKIAFAKEFAKEFAKEFAKE", secretAccessKey: "fake-secret-access-key" },
      config: { region: "us-east-1" },
      model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      label: "bedrock-smoke",
    });

    expect(fetchMock).toHaveBeenCalled();

    const input = await getResolveInputForUser(
      userId,
      "amazon-bedrock",
      "anthropic.claude-3-5-sonnet-20241022-v2:0",
    );
    expect(JSON.parse(input.apiKey)).toMatchObject({ accessKeyId: "AKIAFAKEFAKEFAKEFAKE" });
  });
});

describe("google-vertex — live rollout smoke test (service-account JWT)", () => {
  let userId: string;
  // A real key pair — google-auth-library signs a real JWT locally with
  // crypto.createSign() before exchanging it, so a syntactically-fake PEM
  // would fail before any network call happens.
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `vertex-smoke-${Date.now()}@test.local` },
    });
    userId = user.id;
    nock.disableNetConnect();
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    nock.enableNetConnect();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    nock.cleanAll();
  });

  it("exchanges a real signed JWT for a token and validates against a mocked generateContent response", async () => {
    const tokenExchange = nock("https://oauth2.googleapis.com")
      .post("/token")
      .reply(200, { access_token: "fake-access-token", expires_in: 3600, token_type: "Bearer" });

    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      expect(String(input)).toContain("generateContent");
      const authHeader = new Headers(init?.headers).get("authorization") ?? "";
      expect(authHeader).toBe("Bearer fake-access-token");
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: { role: "model", parts: [{ text: "OK" }] },
              finishReason: "STOP",
            },
          ],
          usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await addProviderKey({
      userId,
      provider: "google-vertex",
      secrets: { clientEmail: "svc-account@my-project.iam.gserviceaccount.com", privateKey },
      config: { project: "my-project", location: "us-central1" },
      model: "gemini-2.5-pro",
      label: "vertex-smoke",
    });

    expect(tokenExchange.isDone()).toBe(true);
    expect(fetchMock).toHaveBeenCalled();

    const input = await getResolveInputForUser(userId, "google-vertex", "gemini-2.5-pro");
    expect(JSON.parse(input.apiKey)).toMatchObject({
      clientEmail: "svc-account@my-project.iam.gserviceaccount.com",
    });
  });
});
