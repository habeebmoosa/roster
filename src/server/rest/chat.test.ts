import { describe, expect, it } from "vitest";
import { parseAgentDefinition } from "@/core/agent";
import { BadRequestError, resolveChatRequest } from "./chat";

const WITH_DEFAULT_MODEL = parseAgentDefinition({
  id: "test-agent",
  name: "Test Employee",
  role: "QA Specialist",
  identity: "Thorough.",
  voice: "Direct.",
  model: { provider: "openai", model: "gpt-4o-mini" },
});

const WITHOUT_DEFAULT_MODEL = parseAgentDefinition({
  id: "test-agent-no-model",
  name: "Test Employee",
  role: "QA Specialist",
  identity: "Thorough.",
  voice: "Direct.",
});

describe("resolveChatRequest", () => {
  it("uses the caller's provider/model when given", () => {
    const resolved = resolveChatRequest(
      {
        messages: [{ role: "user", content: "hi" }],
        provider: "anthropic",
        model: "claude-sonnet-5",
      },
      WITH_DEFAULT_MODEL,
    );
    expect(resolved.provider).toBe("anthropic");
    expect(resolved.model).toBe("claude-sonnet-5");
    expect(resolved.ephemeralKey).toBeUndefined();
  });

  it("falls back to the agent's own default model when omitted", () => {
    const resolved = resolveChatRequest(
      { messages: [{ role: "user", content: "hi" }] },
      WITH_DEFAULT_MODEL,
    );
    expect(resolved.provider).toBe("openai");
    expect(resolved.model).toBe("gpt-4o-mini");
  });

  it("throws when neither the caller nor the agent has a model", () => {
    expect(() =>
      resolveChatRequest({ messages: [{ role: "user", content: "hi" }] }, WITHOUT_DEFAULT_MODEL),
    ).toThrow(BadRequestError);
  });

  it("rejects an empty messages array", () => {
    expect(() => resolveChatRequest({ messages: [] }, WITH_DEFAULT_MODEL)).toThrow(BadRequestError);
  });

  it("rejects a malformed body", () => {
    expect(() => resolveChatRequest(null, WITH_DEFAULT_MODEL)).toThrow(BadRequestError);
    expect(() =>
      resolveChatRequest({ messages: [{ role: "system", content: "hi" }] }, WITH_DEFAULT_MODEL),
    ).toThrow(BadRequestError);
  });

  it("carries an ephemeral key through when the caller supplies one, without touching stored keys", () => {
    const resolved = resolveChatRequest(
      {
        messages: [{ role: "user", content: "hi" }],
        provider: "custom",
        model: "mock-model",
        apiKey: "sk-caller-supplied",
        baseUrl: "https://example.com",
      },
      WITH_DEFAULT_MODEL,
    );
    expect(resolved.ephemeralKey).toEqual({
      apiKey: "sk-caller-supplied",
      baseUrl: "https://example.com",
    });
  });

  it("omits baseUrl on the ephemeral key when not given", () => {
    const resolved = resolveChatRequest(
      {
        messages: [{ role: "user", content: "hi" }],
        provider: "custom",
        model: "mock-model",
        apiKey: "sk-caller-supplied",
      },
      WITH_DEFAULT_MODEL,
    );
    expect(resolved.ephemeralKey).toEqual({ apiKey: "sk-caller-supplied", baseUrl: undefined });
  });
});
