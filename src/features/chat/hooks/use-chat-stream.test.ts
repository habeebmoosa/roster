// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useChatStream } from "./use-chat-stream";

function streamResponse(chunks: string[], conversationId = "conv-1"): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "X-Conversation-Id": conversationId },
  });
}

describe("useChatStream", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("appends the user message immediately, then streams the assistant reply", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse(["Hello", " world"])));

    const { result } = renderHook(() => useChatStream({ agentId: "a", provider: "p", model: "m" }));

    await act(async () => {
      await result.current.send("Hi there");
    });

    expect(result.current.messages).toEqual([
      { role: "user", content: "Hi there" },
      { role: "assistant", content: "Hello world" },
    ]);
    expect(result.current.running).toBe(false);
    expect(result.current.error).toBe("");
  });

  it("does not send an empty/whitespace-only message", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useChatStream({ agentId: "a", provider: "p", model: "m" }));

    await act(async () => {
      await result.current.send("   ");
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.messages).toEqual([]);
  });

  it("surfaces a server error and rolls back the optimistic turns", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: { message: "Invalid key" } }), { status: 400 }),
        ),
    );
    const { result } = renderHook(() => useChatStream({ agentId: "a", provider: "p", model: "m" }));

    await act(async () => {
      await result.current.send("Hi");
    });

    expect(result.current.error).toBe("Invalid key");
    // The user's message stays visible; only the failed empty assistant
    // placeholder is dropped.
    expect(result.current.messages).toEqual([{ role: "user", content: "Hi" }]);
  });

  it("clear() resets messages and error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse(["ok"])));
    const { result } = renderHook(() => useChatStream({ agentId: "a", provider: "p", model: "m" }));

    await act(async () => {
      await result.current.send("Hi");
    });
    expect(result.current.messages.length).toBeGreaterThan(0);

    act(() => {
      result.current.clear();
    });
    expect(result.current.messages).toEqual([]);
  });

  it("captures conversationId from the response header on the first turn", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse(["hi"], "conv-123")));
    const { result } = renderHook(() => useChatStream({ agentId: "a", provider: "p", model: "m" }));

    expect(result.current.conversationId).toBeUndefined();
    await act(async () => {
      await result.current.send("Hi");
    });
    expect(result.current.conversationId).toBe("conv-123");
  });

  it("sends only the new message and the existing conversationId — never the full transcript", async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse(["ok"], "conv-123"));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useChatStream({ agentId: "a", provider: "p", model: "m" }));

    await act(async () => {
      await result.current.send("First message");
    });
    await act(async () => {
      await result.current.send("Second message");
    });

    const secondCallBody = JSON.parse(fetchMock.mock.calls[1]![1].body);
    expect(secondCallBody).toEqual({
      agentId: "a",
      provider: "p",
      model: "m",
      conversationId: "conv-123",
      content: "Second message",
    });
  });

  it("clear() resets conversationId, starting a new conversation on the next send", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse(["ok"], "conv-123")));
    const { result } = renderHook(() => useChatStream({ agentId: "a", provider: "p", model: "m" }));

    await act(async () => {
      await result.current.send("Hi");
    });
    expect(result.current.conversationId).toBe("conv-123");

    act(() => {
      result.current.clear();
    });
    expect(result.current.conversationId).toBeUndefined();
  });

  it("loadConversation() replaces messages and sets conversationId for the next send()", async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse(["reply"], "conv-existing"));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useChatStream({ agentId: "a", provider: "p", model: "m" }));

    act(() => {
      result.current.loadConversation("conv-existing", [
        { role: "user", content: "earlier message" },
        { role: "assistant", content: "earlier reply" },
      ]);
    });

    expect(result.current.conversationId).toBe("conv-existing");
    expect(result.current.messages).toEqual([
      { role: "user", content: "earlier message" },
      { role: "assistant", content: "earlier reply" },
    ]);

    await act(async () => {
      await result.current.send("new message");
    });

    const callBody = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(callBody.conversationId).toBe("conv-existing");
    expect(callBody.content).toBe("new message");
  });
});
