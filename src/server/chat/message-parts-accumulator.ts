import type { UIMessageChunk } from "ai";
import type { MessagePart } from "@/core/agent";
import type { McpToolMetadata } from "@/core/mcp";

type TextPart = Extract<MessagePart, { type: "text" }>;
type ReasoningPart = Extract<MessagePart, { type: "reasoning" }>;
type ToolCallPart = Extract<MessagePart, { type: "tool-call" }>;

/**
 * Incrementally builds an ordered `MessagePart[]` from the same
 * `UIMessageChunk`s already being written to the client — text, reasoning,
 * and tool-call blocks land in `parts` in the order they actually arrived,
 * so a reloaded turn renders identically to how it streamed live. Kept
 * separate from the streaming loop so it's unit-testable without a real
 * model call.
 */
export class MessagePartsAccumulator {
  readonly parts: MessagePart[] = [];
  private readonly textIndexById = new Map<string, number>();
  private readonly reasoningIndexById = new Map<string, number>();
  private readonly toolCallIndexById = new Map<string, number>();

  apply(chunk: UIMessageChunk): void {
    switch (chunk.type) {
      case "text-start":
        this.parts.push({ type: "text", text: "" });
        this.textIndexById.set(chunk.id, this.parts.length - 1);
        break;
      case "text-delta": {
        const part = this.textPart(chunk.id);
        if (part) part.text += chunk.delta;
        break;
      }
      case "reasoning-start":
        this.parts.push({ type: "reasoning", text: "", done: false, startedAt: Date.now() });
        this.reasoningIndexById.set(chunk.id, this.parts.length - 1);
        break;
      case "reasoning-delta": {
        const part = this.reasoningPart(chunk.id);
        if (part) part.text += chunk.delta;
        break;
      }
      case "reasoning-end": {
        const part = this.reasoningPart(chunk.id);
        if (part) {
          part.done = true;
          part.endedAt = Date.now();
        }
        break;
      }
      case "tool-input-start": {
        const metadata = chunk.toolMetadata as Partial<McpToolMetadata> | undefined;
        this.parts.push({
          type: "tool-call",
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          source: metadata?.source === "mcp" ? "mcp" : "builtin",
          connectorName: metadata?.serverName,
          input: undefined,
          state: "input-streaming",
        });
        this.toolCallIndexById.set(chunk.toolCallId, this.parts.length - 1);
        break;
      }
      case "tool-input-available": {
        const part = this.toolCallPart(chunk.toolCallId);
        if (part) {
          part.input = chunk.input;
          part.state = "input-available";
        }
        break;
      }
      case "tool-input-error": {
        const part = this.toolCallPart(chunk.toolCallId);
        if (part) {
          part.input = chunk.input;
          part.state = "output-error";
          part.errorText = chunk.errorText;
        }
        break;
      }
      case "tool-output-available": {
        const part = this.toolCallPart(chunk.toolCallId);
        if (part) {
          part.output = chunk.output;
          part.state = "output-available";
        }
        break;
      }
      case "tool-output-error": {
        const part = this.toolCallPart(chunk.toolCallId);
        if (part) {
          part.state = "output-error";
          part.errorText = chunk.errorText;
        }
        break;
      }
      default:
        break;
    }
  }

  private textPart(id: string): TextPart | undefined {
    const idx = this.textIndexById.get(id);
    return idx !== undefined ? (this.parts[idx] as TextPart) : undefined;
  }

  private reasoningPart(id: string): ReasoningPart | undefined {
    const idx = this.reasoningIndexById.get(id);
    return idx !== undefined ? (this.parts[idx] as ReasoningPart) : undefined;
  }

  private toolCallPart(id: string): ToolCallPart | undefined {
    const idx = this.toolCallIndexById.get(id);
    return idx !== undefined ? (this.parts[idx] as ToolCallPart) : undefined;
  }
}
