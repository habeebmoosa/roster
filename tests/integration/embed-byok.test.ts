import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { embedTexts, TARGET_EMBEDDING_DIMENSIONS } from "@/core/providers";
import { startMockOpenAIServer, type MockServer } from "../helpers/mock-openai-server";

/**
 * embedTexts() end-to-end (offline) against a mock OpenAI-compatible
 * /embeddings endpoint, proving the request carries the requested dimension
 * and the response is parsed into plain number[][] with no padding needed
 * when the provider already returns the target width.
 */
const API_KEY = "test-key-123";
let mock: MockServer;

beforeAll(async () => {
  mock = await startMockOpenAIServer({ apiKey: API_KEY });
});

afterAll(async () => {
  await mock.close();
});

describe("embedTexts (BYOK, mock OpenAI-compatible provider)", () => {
  it("embeds a batch of texts, requesting TARGET_EMBEDDING_DIMENSIONS", async () => {
    const embeddings = await embedTexts(
      { provider: "openai", apiKey: API_KEY, baseUrl: mock.url },
      ["hello", "world"],
    );

    expect(embeddings).toHaveLength(2);
    for (const vector of embeddings) {
      expect(vector).toHaveLength(TARGET_EMBEDDING_DIMENSIONS);
    }
    // Different inputs (of different lengths) must not collapse to identical vectors.
    expect(embeddings[0]).not.toEqual(embeddings[1]);

    const lastRequest = mock.requests.at(-1);
    expect(lastRequest?.dimensions).toBe(TARGET_EMBEDDING_DIMENSIONS);
    expect(lastRequest?.input).toEqual(["hello", "world"]);
  });

  it("maps an invalid key to a ByokError", async () => {
    await expect(
      embedTexts({ provider: "openai", apiKey: "wrong-key", baseUrl: mock.url }, ["hi"]),
    ).rejects.toMatchObject({ code: "invalid_key" });
  });
});
