/**
 * One ordered block of an assistant turn — text, a reasoning/thinking
 * segment, or a tool call — in the order it actually happened. Mirrors the
 * AI SDK's own `UIMessage.parts` convention; this is the shape both the
 * server (accumulating a turn to persist) and the chat UI (rendering a live
 * or reloaded turn) share.
 */
export type MessagePart =
  | { type: "text"; text: string }
  | {
      type: "reasoning";
      text: string;
      done: boolean;
      startedAt: number;
      endedAt?: number;
    }
  | {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      source: "mcp" | "builtin";
      connectorName?: string;
      input: unknown;
      output?: unknown;
      state: "input-streaming" | "input-available" | "output-available" | "output-error";
      errorText?: string;
    };
