"use client";

import { useState } from "react";
import type { MessagePart } from "@/core/agent";
import { cn } from "@/lib/cn";
import { IconChevronDown } from "@/ui";

type ToolCallPart = Extract<MessagePart, { type: "tool-call" }>;

// Same glyph/color language as StepEventsList — a tool call is just a
// finer-grained kind of "step" in the same message flow.
const STATUS_ICON: Record<ToolCallPart["state"], string> = {
  "input-streaming": "◌",
  "input-available": "◌",
  "output-available": "✓",
  "output-error": "!",
};

const STATUS_CLASSES: Record<ToolCallPart["state"], string> = {
  "input-streaming": "text-text-muted",
  "input-available": "text-text-muted",
  "output-available": "text-success",
  "output-error": "text-warning",
};

function formatJson(value: unknown): string {
  if (value === undefined) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** Which tool was called, which connector it came from (if any), and its input/output — expandable for detail. */
export function ToolCallChip({ part }: { part: ToolCallPart }) {
  const [expanded, setExpanded] = useState(false);
  const running = part.state === "input-streaming" || part.state === "input-available";

  return (
    <div className="border-border bg-bg-subtle rounded-xl border text-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs"
      >
        <span
          aria-hidden="true"
          className={cn(STATUS_CLASSES[part.state], running && "animate-pulse")}
        >
          {STATUS_ICON[part.state]}
        </span>
        <span className="text-text truncate font-mono">{part.toolName}</span>
        {part.connectorName ? (
          <span className="text-text-faint truncate">via {part.connectorName}</span>
        ) : null}
        <IconChevronDown
          className={cn(
            "text-text-faint ml-auto h-3.5 w-3.5 shrink-0 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>
      {expanded ? (
        <div className="border-border flex flex-col gap-2 border-t px-3 py-2 text-xs">
          <div>
            <p className="text-text-faint font-medium tracking-wide uppercase">Input</p>
            <pre className="text-text mt-1 overflow-x-auto font-mono text-xs whitespace-pre-wrap">
              {formatJson(part.input)}
            </pre>
          </div>
          {part.state === "output-available" ? (
            <div>
              <p className="text-text-faint font-medium tracking-wide uppercase">Output</p>
              <pre className="text-text mt-1 overflow-x-auto font-mono text-xs whitespace-pre-wrap">
                {formatJson(part.output)}
              </pre>
            </div>
          ) : null}
          {part.state === "output-error" ? (
            <p className="text-warning">{part.errorText ?? "This tool call failed."}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
