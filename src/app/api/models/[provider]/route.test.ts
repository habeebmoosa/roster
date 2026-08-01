import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
vi.mock("@/server/auth", () => ({ auth: () => auth() }));

const listModelsForProvider = vi.fn();
vi.mock("@/server/db/repositories/model-catalog.repository", () => ({
  listModelsForProvider: (...args: unknown[]) => listModelsForProvider(...args),
}));

const listOllamaModels = vi.fn();
vi.mock("@/server/models/ollama", () => ({
  listOllamaModels: (...args: unknown[]) => listOllamaModels(...args),
}));

function request(url: string): Request {
  return new Request(url);
}

beforeEach(() => {
  auth.mockReset().mockResolvedValue({ user: { id: "user-1" } });
  listModelsForProvider.mockReset();
  listOllamaModels.mockReset();
});

describe("GET /api/models/[provider]", () => {
  it("returns 401 when unauthenticated", async () => {
    auth.mockResolvedValueOnce(null);
    const { GET } = await import("./route");
    const res = await GET(request("http://localhost/api/models/openai"), {
      params: Promise.resolve({ provider: "openai" }),
    });
    expect(res.status).toBe(401);
  });

  it("shapes catalog rows into ModelOption for a DB-backed provider", async () => {
    listModelsForProvider.mockResolvedValueOnce([
      {
        provider: "openai",
        modelId: "gpt-5",
        label: "GPT-5",
        contextWindow: 400000,
        maxOutputTokens: 128000,
        inputPricePerMTok: 1.25,
        outputPricePerMTok: 10,
        reasoningSupport: true,
        toolCallSupport: true,
        // fields ModelOption doesn't need — proves the route projects, not passes through raw
        source: "models.dev",
        description: "...",
      },
    ]);
    const { GET } = await import("./route");
    const res = await GET(request("http://localhost/api/models/openai"), {
      params: Promise.resolve({ provider: "openai" }),
    });
    const body = await res.json();

    expect(listModelsForProvider).toHaveBeenCalledWith("openai");
    expect(body.models).toEqual([
      {
        modelId: "gpt-5",
        label: "GPT-5",
        contextWindow: 400000,
        maxOutputTokens: 128000,
        inputPricePerMTok: 1.25,
        outputPricePerMTok: 10,
        reasoningSupport: true,
        toolCallSupport: true,
      },
    ]);
  });

  it("returns an empty list for ollama when no baseUrl is given, without calling listOllamaModels", async () => {
    const { GET } = await import("./route");
    const res = await GET(request("http://localhost/api/models/ollama"), {
      params: Promise.resolve({ provider: "ollama" }),
    });
    const body = await res.json();
    expect(body.models).toEqual([]);
    expect(listOllamaModels).not.toHaveBeenCalled();
  });

  it("live-introspects ollama when a baseUrl is given", async () => {
    listOllamaModels.mockResolvedValueOnce([{ modelId: "llama3.3", label: "llama3.3", sizeBytes: 123 }]);
    const { GET } = await import("./route");
    const res = await GET(
      request("http://localhost/api/models/ollama?baseUrl=http%3A%2F%2Flocalhost%3A11434%2Fv1"),
      { params: Promise.resolve({ provider: "ollama" }) },
    );
    const body = await res.json();

    expect(listOllamaModels).toHaveBeenCalledWith("http://localhost:11434/v1");
    expect(body.models).toEqual([{ modelId: "llama3.3", label: "llama3.3" }]);
  });

  it("returns an empty list (not an error) when the ollama instance is unreachable", async () => {
    listOllamaModels.mockRejectedValueOnce(new Error("fetch failed"));
    const { GET } = await import("./route");
    const res = await GET(request("http://localhost/api/models/ollama?baseUrl=http%3A%2F%2Fbad"), {
      params: Promise.resolve({ provider: "ollama" }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).models).toEqual([]);
  });
});
