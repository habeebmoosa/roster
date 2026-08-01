// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useModelOptions } from "./use-model-options";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetchOnce(body: unknown) {
  (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    json: async () => body,
  });
}

describe("useModelOptions", () => {
  it("fetches /api/models/{provider} immediately for a DB-backed provider", async () => {
    mockFetchOnce({ models: [{ modelId: "gpt-5", label: "GPT-5", contextWindow: 400000 }] });
    const { result } = renderHook(() => useModelOptions("openai"));

    await waitFor(() => expect(result.current.options).toHaveLength(1));
    expect(fetch).toHaveBeenCalledWith("/api/models/openai");
    expect(result.current.options[0]).toMatchObject({ modelId: "gpt-5", contextWindow: 400000 });
  });

  it("does not fetch when providerId is empty (e.g. no provider selected yet)", () => {
    renderHook(() => useModelOptions(""));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not fetch for Ollama until a base URL is provided", () => {
    renderHook(() => useModelOptions("ollama", undefined));
    expect(fetch).not.toHaveBeenCalled();

    renderHook(() => useModelOptions("ollama", "   "));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches Ollama's /api/models/ollama?baseUrl=... once a base URL is given (debounced)", async () => {
    vi.useFakeTimers();
    mockFetchOnce({ models: [{ modelId: "llama3.3", label: "llama3.3" }] });

    const { result } = renderHook(() => useModelOptions("ollama", "http://localhost:11434/v1"));
    expect(fetch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    expect(fetch).toHaveBeenCalledWith(
      "/api/models/ollama?baseUrl=http%3A%2F%2Flocalhost%3A11434%2Fv1",
    );
    await vi.waitFor(() => expect(result.current.options).toHaveLength(1));
    vi.useRealTimers();
  });

  it("resolves to an empty list when the response isn't ok, without throwing", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false });
    const { result } = renderHook(() => useModelOptions("custom"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.options).toEqual([]);
  });
});
