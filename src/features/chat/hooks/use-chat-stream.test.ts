// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useChatStream } from "./use-chat-stream";

/** Encodes a list of UI Message Stream chunk objects as the real SSE wire format (data: {...}\n\n, terminated by data: [DONE]\n\n). */
function sseResponse(chunks: unknown[], conversationId = "conv-1"): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "X-Conversation-Id": conversationId },
  });
}

/** A plain text-delta reply, the shape most tests only care about. */
function textReply(text: string, conversationId = "conv-1"): Response {
  return sseResponse(
    [
      { type: "start" },
      { type: "text-start", id: "t1" },
      { type: "text-delta", id: "t1", delta: text },
      { type: "text-end", id: "t1" },
      { type: "finish" },
    ],
    conversationId,
  );
}

describe("useChatStream", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("appends the user message immediately, then streams the assistant reply", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          sseResponse([
            { type: "start" },
            { type: "text-start", id: "t1" },
            { type: "text-delta", id: "t1", delta: "Hello" },
            { type: "text-delta", id: "t1", delta: " world" },
            { type: "text-end", id: "t1" },
            { type: "finish" },
          ]),
        ),
    );

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

  it("surfaces a pre-stream request error and rolls back the optimistic turns", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "That conversation doesn't exist." } }), {
          status: 404,
        }),
      ),
    );
    const { result } = renderHook(() => useChatStream({ agentId: "a", provider: "p", model: "m" }));

    await act(async () => {
      await result.current.send("Hi");
    });

    expect(result.current.error).toBe("That conversation doesn't exist.");
    // The user's message stays visible; only the failed empty assistant
    // placeholder is dropped.
    expect(result.current.messages).toEqual([{ role: "user", content: "Hi" }]);
  });

  it("surfaces an in-stream structured error on the assistant turn, without touching content as text", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          sseResponse([
            { type: "start" },
            { type: "error", errorText: "The API key was rejected." },
            { type: "finish" },
          ]),
        ),
    );
    const { result } = renderHook(() => useChatStream({ agentId: "a", provider: "p", model: "m" }));

    await act(async () => {
      await result.current.send("Hi");
    });

    expect(result.current.messages).toEqual([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "", error: "The API key was rejected." },
    ]);
  });

  it("accumulates data-stepEvent chunks onto the assistant message as they stream in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse([
          { type: "start" },
          {
            type: "data-stepEvent",
            data: { type: "step-start", index: 1, goal: "Look something up" },
          },
          {
            type: "data-stepEvent",
            data: { type: "step-complete", index: 1, passed: true, attempts: 1 },
          },
          { type: "text-start", id: "t1" },
          { type: "text-delta", id: "t1", delta: "Done." },
          { type: "text-end", id: "t1" },
          { type: "finish" },
        ]),
      ),
    );
    const { result } = renderHook(() => useChatStream({ agentId: "a", provider: "p", model: "m" }));

    await act(async () => {
      await result.current.send("Hi");
    });

    const assistant = result.current.messages[1]!;
    expect(assistant.content).toBe("Done.");
    expect(assistant.stepEvents).toEqual([
      { type: "step-start", index: 1, goal: "Look something up" },
      { type: "step-complete", index: 1, passed: true, attempts: 1 },
    ]);
  });

  it("clear() resets messages and error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(textReply("ok")));
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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(textReply("hi", "conv-123")));
    const { result } = renderHook(() => useChatStream({ agentId: "a", provider: "p", model: "m" }));

    expect(result.current.conversationId).toBeUndefined();
    await act(async () => {
      await result.current.send("Hi");
    });
    expect(result.current.conversationId).toBe("conv-123");
  });

  it("sends only the new message and the existing conversationId — never the full transcript", async () => {
    const fetchMock = vi.fn().mockResolvedValue(textReply("ok", "conv-123"));
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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(textReply("ok", "conv-123")));
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
    const fetchMock = vi.fn().mockResolvedValue(textReply("reply", "conv-existing"));
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
