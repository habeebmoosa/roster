"use client";

import { useState } from "react";
import type { MessagePart } from "@/core/agent";
import { cn } from "@/lib/cn";
import { IconChevronDown, Markdown } from "@/ui";

type ReasoningPart = Extract<MessagePart, { type: "reasoning" }>;

function summaryLabel(part: ReasoningPart): string {
  if (!part.done || part.endedAt === undefined) return "Thinking";
  const seconds = Math.max(1, Math.round((part.endedAt - part.startedAt) / 1000));
  return `Thought for ${seconds}s`;
}

/**
 * A model's reasoning/thinking segment — expanded by default while it's
 * still streaming (so the live thought is visible), collapsing to a
 * "Thought for Ns" summary once done, matching the Claude/ChatGPT/Gemini
 * convention. `null` overrides the default so a manual toggle sticks
 * regardless of which way `part.done` next changes.
 */
export function ReasoningBlock({ part }: { part: ReasoningPart }) {
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const expanded = manualExpanded ?? !part.done;

  return (
    <div className="border-border bg-bg-subtle rounded-xl border text-sm">
      <button
        type="button"
        onClick={() => setManualExpanded(!expanded)}
        aria-expanded={expanded}
        className="text-text-muted hover:text-text flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium"
      >
        <span className={cn(!part.done && "animate-pulse")}>{summaryLabel(part)}</span>
        <IconChevronDown
          className={cn("ml-auto h-3.5 w-3.5 shrink-0 transition-transform", expanded && "rotate-180")}
        />
      </button>
      {expanded ? (
        <div className="border-border text-text-muted border-t px-3 py-2">
          {part.text ? (
            <Markdown size="xs" className="text-text-muted">
              {part.text}
            </Markdown>
          ) : (
            <p className="text-xs leading-relaxed">…</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
