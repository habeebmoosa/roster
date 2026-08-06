import { beforeEach, describe, expect, it, vi } from "vitest";
import { logUsageEvent } from "./usage";

const getModelPricing = vi.fn();
vi.mock("@/server/db/repositories/model-catalog.repository", () => ({
  getModelPricing: (...args: unknown[]) => getModelPricing(...args),
}));

const createUsageEvent = vi.fn();
vi.mock("@/server/db/repositories/usage-event.repository", () => ({
  createUsageEvent: (...args: unknown[]) => createUsageEvent(...args),
}));

describe("logUsageEvent", () => {
  beforeEach(() => {
    getModelPricing.mockReset();
    createUsageEvent.mockReset();
  });

  it("computes a real cost when the model is priced in the catalog", async () => {
    getModelPricing.mockResolvedValueOnce({ inputPricePerMTok: 3, outputPricePerMTok: 15 });
    createUsageEvent.mockResolvedValueOnce(undefined);

    await logUsageEvent({
      userId: "user-1",
      agentId: "customer-support",
      conversationId: "conv-1",
      source: "chat",
      provider: "anthropic",
      model: "claude-sonnet-5",
      inputTokens: 1_000_000,
      outputTokens: 500_000,
    });

    expect(createUsageEvent).toHaveBeenCalledWith({
      userId: "user-1",
      agentId: "customer-support",
      conversationId: "conv-1",
      source: "chat",
      provider: "anthropic",
      model: "claude-sonnet-5",
      inputTokens: 1_000_000,
      outputTokens: 500_000,
      costUsd: 3 + 7.5, // 1M input tokens @ $3/Mtok + 0.5M output tokens @ $15/Mtok
    });
  });

  it("records tokens with a null cost when the model isn't in the catalog", async () => {
    getModelPricing.mockResolvedValueOnce(null);
    createUsageEvent.mockResolvedValueOnce(undefined);

    await logUsageEvent({
      userId: "user-1",
      agentId: "customer-support",
      source: "rest",
      provider: "ollama",
      model: "llama3.1",
      inputTokens: 100,
      outputTokens: 200,
    });

    expect(createUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({ inputTokens: 100, outputTokens: 200, costUsd: null }),
    );
  });

  it("records a null cost when only one side of the pricing is known", async () => {
    getModelPricing.mockResolvedValueOnce({ inputPricePerMTok: 3, outputPricePerMTok: null });
    createUsageEvent.mockResolvedValueOnce(undefined);

    await logUsageEvent({
      userId: "user-1",
      agentId: "customer-support",
      source: "chat",
      provider: "custom",
      model: "partially-priced",
      inputTokens: 100,
      outputTokens: 200,
    });

    expect(createUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({ costUsd: null }),
    );
  });

  it("never throws when the repository write fails — usage logging must not break the chat response", async () => {
    getModelPricing.mockResolvedValueOnce(null);
    createUsageEvent.mockRejectedValueOnce(new Error("db down"));

    await expect(
      logUsageEvent({
        userId: "user-1",
        agentId: "customer-support",
        source: "chat",
        provider: "anthropic",
        model: "claude-sonnet-5",
        inputTokens: 1,
        outputTokens: 1,
      }),
    ).resolves.toBeUndefined();
  });

  it("never throws when the pricing lookup itself fails", async () => {
    getModelPricing.mockRejectedValueOnce(new Error("db down"));

    await expect(
      logUsageEvent({
        userId: "user-1",
        agentId: "customer-support",
        source: "chat",
        provider: "anthropic",
        model: "claude-sonnet-5",
        inputTokens: 1,
        outputTokens: 1,
      }),
    ).resolves.toBeUndefined();
    expect(createUsageEvent).not.toHaveBeenCalled();
  });
});
