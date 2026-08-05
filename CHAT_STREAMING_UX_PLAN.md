# Chat Streaming UX — Thinking, Tool Visibility, Loading Animation

> Status: draft, awaiting review.

## 1. Goal

Three chat-UI asks, all rooted in the same gap — the chat stream only ever
carries plain text today:

1. Replace the static `…` "waiting for a response" placeholder with a real
   loading animation.
2. Surface model "thinking"/reasoning (Claude/ChatGPT/Gemini-style
   collapsible "Thinking" block) for models that actually produce it.
3. Show which tool was called and which connector it came from, inline,
   as the response streams and after it's done.

## 2. Current state

| Piece | File | Today |
|---|---|---|
| Loading indicator | `chat-thread.tsx:52` | A literal `<p>…</p>` — one static character, no animation. |
| Message shape | `features/chat/types.ts` | `ChatMessage` is flat: `role`, `content: string`, `stepEvents?`, `error?`. No ordered "parts" concept at all. |
| Server stream | `server/chat/service.ts` | `createUIMessageStream` writes exactly 3 chunk kinds: `text-start/delta/end`, `data-stepEvent` (workflow step boundaries — plan decomposition, not tool calls), `error`. |
| Core streaming | `core/agent/run-agent.ts` | The "bypass" (single-step, common case) path calls `streamText(...)` but only returns `textStream`/`text`/`usage` — `toolCalls`, `toolResults`, and any reasoning output are discarded at this boundary. The multi-step workflow path never streams live at all (returns one resolved chunk); tools *are* used inside it (`executor.ts`) but nothing about that reaches the caller either. |
| Client parser | `use-chat-stream.ts` | Hand-rolled switch on exactly 3 chunk types (`text-delta`, `data-stepEvent`, `error`); anything else (`tool-call`, `reasoning-*`, etc.) is silently dropped. |
| Reasoning config | — | **Does not exist anywhere.** No `providerOptions` for extended thinking/reasoning effort is ever set. Verified all three named providers *do* support it in the installed packages: Anthropic `providerOptions.anthropic.thinking = {type:'enabled', budgetTokens}`, OpenAI `providerOptions.openai.reasoningEffort`, Google `providerOptions.google.thinkingConfig`. |
| Tool → connector mapping | `core/mcp/agent-tools.ts` | MCP tools are namespaced `mcp_<serverId>_<toolName>` (`mcpToolId()`), but nothing carries the connector's *display name* alongside a tool call, and nothing parses the id back apart today. |
| Persistence | `prisma/schema.prisma` `Message` | `content String`, `stepEvents Json?`. No slot for reasoning text or tool calls. |

## 3. Decisions

1. **`ChatMessage` becomes an ordered `parts[]` array** (text / reasoning /
   tool-call), not more flat fields bolted onto the existing shape. This
   mirrors the AI SDK's own `UIMessage.parts` model — the framework's own
   convention for exactly this — and is the only way to render a turn that
   genuinely interleaves thinking → tool call → more thinking → text in
   the order it actually happened, rather than three fixed visual bands.
   `content` (plain string) stays as the persisted "final text" column
   ​unchanged — nothing that reads `message.content` today needs to change.
2. **Reasoning is enabled only for models we know support it.** A small,
   explicit allowlist (regex per provider) in a new `core/providers/reasoning.ts`
   — Anthropic Sonnet 4.x/Opus 4.x/Sonnet 3.7+, OpenAI's `o*`/`gpt-5*`
   reasoning family, Google Gemini 2.5+. Forcing a `thinking`/`reasoningEffort`
   param onto a model that doesn't support it is a hard 400 from at least
   two of these providers (verified against the installed provider
   packages), not a silent no-op — so this can't be "just always try it."
   Every other provider/model (including every open-weight/BYOK-compatible
   model this platform's whole thesis rests on) gets no reasoning param at
   all, exactly today's behavior.
3. **Reasoning + live tool-call visibility ship on the "bypass" (single-step)
   streaming path only** — the common case for ordinary turns, and the only
   path that streams live at all today. The multi-step workflow path
   (decompose → execute → validate → retry/rollback) keeps returning one
   resolved final answer with no live tool/reasoning visibility, same as
   today; it's wrapped as a single text part so the client's rendering model
   stays uniform. Extending live visibility into that path is a
   larger, separate change (each step is its own `generateText` call) and is
   called out as explicitly out of scope below.
4. **Tool → connector attribution uses the AI SDK's own mechanism**, not
   string-parsing `mcp_<serverId>_<toolName>` back apart. `tool()` accepts a
   `metadata` field documented as propagating onto that call's `toolMetadata`
   everywhere downstream, including UI message parts — "useful for sources
   of dynamic tools (e.g. an MCP server) to identify themselves" (verbatim
   from the installed package's own doc comment). `wrapMcpToolsForAgent`
   sets `metadata: { source: "mcp", serverId, serverName }` once, at tool
   creation; every tool-call/tool-result event for it carries that
   automatically. Built-in tools get no metadata, so "has `toolMetadata`" is
   how the UI tells an MCP-sourced call from a built-in one.
5. **Chunk conversion uses the SDK's own `toUIMessageStream()` helper**, not
   a hand-rolled mapping of `streamText`'s ~15 raw stream-part shapes to the
   wire protocol's `UIMessageChunk` shapes (the field names genuinely differ,
   e.g. `reasoning-delta.text` vs. the wire protocol's `reasoning-delta.delta`).
   Consumed via a manual `for await` inside `execute()` (not `writer.merge()`)
   so ordering against the final `finish` write and DB persistence stays
   deterministic — `merge()` schedules an independent concurrent promise,
   which risks writing `finish` before a merged chunk lands.
6. **One additive Prisma column**, `Message.parts Json?`, alongside the
   existing `content`/`stepEvents` — not three separate new columns. Old rows
   have `parts: null`; the client falls back to rendering `content` as a
   single text part, so nothing about history reload breaks for existing
   conversations.
7. **No user-facing "enable thinking" toggle in this round.** Reasoning
   turns on automatically wherever the model supports it, at one sane
   default (Anthropic: 4096 thinking-token budget; OpenAI: `medium` effort;
   Google: `includeThoughts: true` with a matching token budget). A
   per-agent/per-session control is a reasonable future addition, not built
   here.

## 4. Architecture

### 4.1 Reasoning capability resolver — `core/providers/reasoning.ts` (new)

```ts
export function resolveReasoningOptions(
  providerId: string,
  modelId: string,
): Record<string, unknown> | undefined {
  // returns e.g. { anthropic: { thinking: { type: "enabled", budgetTokens: 4096 } } }
  // or { openai: { reasoningEffort: "medium" } }
  // or { google: { thinkingConfig: { includeThoughts: true, thinkingBudget: 4096 } } }
  // or undefined when providerId/modelId doesn't match a known reasoning-capable pattern
}
```

Called once, in `server/agents/service.ts` → `streamAgentChat()` (it already
has `input.provider`/`input.model` in scope), and passed into `runAgent()` as
a new optional `providerOptions` input — kept out of `core/agent` itself
(that module shouldn't own "which models can reason," same layering as it
not owning BYOK resolution today).

### 4.2 MCP tool metadata — `core/mcp/agent-tools.ts`

`McpServerToolBinding` gains `serverName: string`; `wrapMcpToolsForAgent`
adds `metadata: { source: "mcp", serverId, serverName }` to every `tool({...})`
it builds (including the auto-generated `list_resources`/`read_resource`
pair). `resolveMcpToolsForAgent` (already loads the full `McpServerRecord`,
which has `.name`) passes it through.

### 4.3 `core/agent/run-agent.ts`

The bypass path's `streamText()` call gains `providerOptions` (when
resolved) and now also returns `fullStream` on `RunAgentResult` (undefined
on the workflow path — nothing else about that path changes):

```ts
export interface RunAgentResult {
  textStream: AsyncIterable<string>;
  text: Promise<string>;
  usage: Promise<RunAgentUsage>;
  retrievedSourceUris?: string[];
  /** Only set on the bypass path — the raw AI SDK stream, for reasoning/tool-call visibility. */
  fullStream?: AsyncIterable<TextStreamPart<ToolSet>>;
}
```

### 4.4 `server/chat/service.ts`

When `result.fullStream` exists, drive one unified loop instead of the
current text-only one:

```ts
if (result.fullStream) {
  for await (const chunk of toUIMessageStream({ stream: result.fullStream, sendReasoning: true })) {
    writer.write(chunk);
    // accumulate assistantText / reasoningText / toolCalls[] into `parts` as chunks arrive
  }
} else {
  // unchanged: textStream-only loop (workflow path)
}
```

Persists `content` (unchanged) + new `parts` (ordered text/reasoning/tool-call
blocks, built from the same accumulation) + existing `stepEvents`.

### 4.5 Prisma — `Message.parts Json?`

Migration generated, **SQL inspected before applying** (this repo's
pgvector-migration-drift lesson applies generally, not just to vector
indexes — always read the generated SQL). `conversation.repository.ts`'s
`MessageRecord`/`appendMessage` gain `parts`; `/api/conversations/[id]/route.ts`
includes it in the JSON it returns.

### 4.6 Client — `features/chat/types.ts`

```ts
export type MessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string; done: boolean; startedAt: number; endedAt?: number }
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

export interface ChatMessage {
  role: "user" | "assistant";
  content: string; // unchanged — user bubble text, or a convenience mirror of the assistant's final text
  parts?: MessagePart[]; // assistant turns only
  stepEvents?: WorkflowStepEvent[];
  error?: string;
}
```

### 4.7 `use-chat-stream.ts`

Switch grows to handle `text-start/delta/end`, `reasoning-start/delta/end`,
`tool-input-start/available/error`, `tool-output-available/error`,
`data-stepEvent`, `error` — each appending to or updating the last part in
`parts[]` (a delta either extends the current open part or opens a new one,
same reducer shape `deriveStepRows` already uses for step events).

### 4.8 New UI

- **`TypingIndicator`** (`ui/` — reusable) — three dots, staggered
  bounce/opacity animation via Tailwind arbitrary `animation-delay` values,
  no new dependency. Shown only when `parts.length === 0` for the streaming
  message (today's `isStreamingPlaceholder` condition, recomputed against
  `parts` instead of `content`) — once any part exists, that part's own
  in-progress affordance takes over.
- **`ReasoningBlock`** (`features/chat/components/`) — collapsible.
  Expanded with a pulsing "Thinking…" label while `!done`; once done,
  collapses to a "Thought for Ns" summary row (click to re-expand), matching
  the observed Claude/ChatGPT/Gemini convention.
- **`ToolCallChip`** (`features/chat/components/`) — one row per tool call:
  running spinner / done check / error mark, tool name (`font-mono`,
  existing convention), "via {connectorName}" when `source === "mcp"`,
  expandable to show input/output (reusing the pill visual language already
  in `connector-detail-dialog.tsx`).
- **`ChatThread`** rewrite: render `message.parts` in arrival order
  (reasoning block / tool chip / markdown text segment), `StepEventsList`
  and `ErrorBanner` unchanged in position (above/below respectively).

## 5. Phased build plan

### Phase 1 — Backend foundations (no visible UI change)
- `core/providers/reasoning.ts` + tests.
- MCP tool metadata (`agent-tools.ts`, `agent-tools-service.ts`).
- `run-agent.ts`: `providerOptions` passthrough + `fullStream` exposure.
- `streamAgentChat()`: resolve and pass `providerOptions`.
- Prisma migration for `Message.parts` (SQL inspected before apply) +
  repository/route plumbing (written, not yet read by the client).

### Phase 2 — Streaming plumbing
- `server/chat/service.ts`: unified `fullStream` loop via `toUIMessageStream()`,
  real reasoning/tool-call/tool-result chunks on the wire, `parts` persisted.

### Phase 3 — Client state model
- `types.ts` (`MessagePart` union), `use-chat-stream.ts` parser rewrite,
  `/api/conversations/[id]` → `ChatMessage.parts` on history reload.

### Phase 4 — UI
- `TypingIndicator`, `ReasoningBlock`, `ToolCallChip`, `ChatThread` rewrite.

### Phase 5 — Polish
- Full gate (typecheck/lint/unit/integration).
- Real-browser check: a reasoning-capable model + an MCP-tool-enabled agent.
- Fix any stale doc claims this surfaces.

## 6. Explicitly out of scope

- A user-facing "enable thinking" toggle.
- Live reasoning/tool-call visibility on the multi-step workflow path.
- Backfilling `parts` for historical messages (they render as one text part).
- Any change to REST API (`POST /v1/agents/{id}/chat`) response shape.
