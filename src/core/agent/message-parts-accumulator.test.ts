import type { UIMessageChunk } from "ai";
import { describe, expect, it } from "vitest";
import { MessagePartsAccumulator } from "./message-parts-accumulator";

function apply(chunks: UIMessageChunk[]): MessagePartsAccumulator {
  const acc = new MessagePartsAccumulator();
  for (const chunk of chunks) acc.apply(chunk);
  return acc;
}

describe("MessagePartsAccumulator", () => {
  it("builds a single text part from text-start/delta/delta/end", () => {
    const acc = apply([
      { type: "text-start", id: "t1" },
      { type: "text-delta", id: "t1", delta: "Hel" },
      { type: "text-delta", id: "t1", delta: "lo" },
      { type: "text-end", id: "t1" },
    ]);
    expect(acc.parts).toEqual([{ type: "text", text: "Hello" }]);
  });

  it("builds a reasoning part, marking it done with an end timestamp", () => {
    const acc = apply([
      { type: "reasoning-start", id: "r1" },
      { type: "reasoning-delta", id: "r1", delta: "Thinking " },
      { type: "reasoning-delta", id: "r1", delta: "it over." },
      { type: "reasoning-end", id: "r1" },
    ]);
    expect(acc.parts).toHaveLength(1);
    const part = acc.parts[0]!;
    expect(part).toMatchObject({ type: "reasoning", text: "Thinking it over.", done: true });
    if (part.type === "reasoning") {
      expect(part.endedAt).toBeGreaterThanOrEqual(part.startedAt);
    }
  });

  it("marks a reasoning part as still in progress before its reasoning-end arrives", () => {
    const acc = apply([
      { type: "reasoning-start", id: "r1" },
      { type: "reasoning-delta", id: "r1", delta: "Still going" },
    ]);
    expect(acc.parts[0]).toMatchObject({ done: false, text: "Still going" });
  });

  it("tags an MCP tool call with its source, connector name, and full input/output lifecycle", () => {
    const acc = apply([
      {
        type: "tool-input-start",
        toolCallId: "call_1",
        toolName: "mcp_linear_search",
        toolMetadata: { source: "mcp", serverId: "linear", serverName: "Linear" },
      },
      {
        type: "tool-input-available",
        toolCallId: "call_1",
        toolName: "mcp_linear_search",
        input: { query: "ticket 123" },
      },
      { type: "tool-output-available", toolCallId: "call_1", output: { status: "resolved" } },
    ]);
    expect(acc.parts).toEqual([
      {
        type: "tool-call",
        toolCallId: "call_1",
        toolName: "mcp_linear_search",
        source: "mcp",
        connectorName: "Linear",
        input: { query: "ticket 123" },
        output: { status: "resolved" },
        state: "output-available",
      },
    ]);
  });

  it("tags a built-in tool call with source 'builtin' when there's no toolMetadata", () => {
    const acc = apply([
      { type: "tool-input-start", toolCallId: "call_2", toolName: "calculate" },
      { type: "tool-input-available", toolCallId: "call_2", toolName: "calculate", input: { expression: "2+2" } },
      { type: "tool-output-available", toolCallId: "call_2", output: "4" },
    ]);
    expect(acc.parts[0]).toMatchObject({ source: "builtin", connectorName: undefined });
  });

  it("records a tool-output-error against the matching call", () => {
    const acc = apply([
      { type: "tool-input-start", toolCallId: "call_3", toolName: "mcp_notion_search" },
      { type: "tool-input-available", toolCallId: "call_3", toolName: "mcp_notion_search", input: {} },
      { type: "tool-output-error", toolCallId: "call_3", errorText: "Connector unreachable" },
    ]);
    expect(acc.parts[0]).toMatchObject({ state: "output-error", errorText: "Connector unreachable" });
  });

  it("records a tool-input-error against the matching call", () => {
    const acc = apply([
      { type: "tool-input-start", toolCallId: "call_4", toolName: "mcp_notion_search" },
      {
        type: "tool-input-error",
        toolCallId: "call_4",
        toolName: "mcp_notion_search",
        input: { bad: true },
        errorText: "Invalid arguments",
      },
    ]);
    expect(acc.parts[0]).toMatchObject({ state: "output-error", errorText: "Invalid arguments" });
  });

  it("preserves chronological order across interleaved reasoning, tool calls, and text", () => {
    const acc = apply([
      { type: "reasoning-start", id: "r1" },
      { type: "reasoning-delta", id: "r1", delta: "Let me check." },
      { type: "reasoning-end", id: "r1" },
      { type: "tool-input-start", toolCallId: "call_1", toolName: "mcp_linear_search" },
      { type: "tool-input-available", toolCallId: "call_1", toolName: "mcp_linear_search", input: {} },
      { type: "tool-output-available", toolCallId: "call_1", output: {} },
      { type: "text-start", id: "t1" },
      { type: "text-delta", id: "t1", delta: "Resolved." },
      { type: "text-end", id: "t1" },
    ]);
    expect(acc.parts.map((p) => p.type)).toEqual(["reasoning", "tool-call", "text"]);
  });

  it("ignores chunk types it doesn't track, without throwing", () => {
    expect(() => apply([{ type: "error", errorText: "boom" }, { type: "start" }])).not.toThrow();
  });

  it("ignores a delta for an id it never saw a -start for", () => {
    const acc = apply([{ type: "text-delta", id: "unknown", delta: "orphan" }]);
    expect(acc.parts).toEqual([]);
  });
});
