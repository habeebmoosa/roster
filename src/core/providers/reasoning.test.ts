import { describe, expect, it } from "vitest";
import { resolveReasoningOptions } from "./reasoning";

describe("resolveReasoningOptions", () => {
  it("enables Anthropic extended thinking for a Sonnet 4+/Opus 4+/3.7-Sonnet model", () => {
    expect(resolveReasoningOptions("anthropic", "claude-sonnet-5")).toEqual({
      anthropic: { thinking: { type: "enabled", budgetTokens: 4096 } },
    });
    expect(resolveReasoningOptions("anthropic", "claude-opus-4-8")).toBeDefined();
    expect(resolveReasoningOptions("anthropic", "claude-3-7-sonnet-20250219")).toBeDefined();
  });

  it("does not enable thinking for Anthropic models that don't support it", () => {
    expect(resolveReasoningOptions("anthropic", "claude-haiku-4-5-20251001")).toBeUndefined();
    expect(resolveReasoningOptions("anthropic", "claude-3-5-sonnet-20241022")).toBeUndefined();
  });

  it("enables OpenAI reasoning effort for the o-series and gpt-5 family", () => {
    expect(resolveReasoningOptions("openai", "o3-mini")).toEqual({
      openai: { reasoningEffort: "medium" },
    });
    expect(resolveReasoningOptions("openai", "gpt-5")).toBeDefined();
  });

  it("does not enable reasoning for non-reasoning OpenAI models", () => {
    expect(resolveReasoningOptions("openai", "gpt-4o")).toBeUndefined();
    expect(resolveReasoningOptions("openai", "gpt-4o-mini")).toBeUndefined();
  });

  it("enables Google thought summaries for Gemini 2.5+", () => {
    expect(resolveReasoningOptions("google", "gemini-2.5-flash")).toEqual({
      google: { thinkingConfig: { includeThoughts: true, thinkingBudget: 4096 } },
    });
  });

  it("does not enable thinking for older Gemini models", () => {
    expect(resolveReasoningOptions("google", "gemini-1.5-pro")).toBeUndefined();
  });

  it("returns undefined for any provider not in the allowlist, regardless of model", () => {
    expect(resolveReasoningOptions("ollama", "llama3.1")).toBeUndefined();
    expect(resolveReasoningOptions("openrouter", "o3-mini")).toBeUndefined();
    expect(resolveReasoningOptions("google-vertex", "gemini-2.5-flash")).toBeUndefined();
  });
});
