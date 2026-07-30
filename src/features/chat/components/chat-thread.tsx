import { Avatar, ErrorBanner } from "@/ui";
import { cn } from "@/lib/cn";
import { deriveStepRows } from "../step-rows";
import type { AgentOption, ChatMessage } from "../types";
import { StepEventsList } from "./step-events-list";

export function ChatThread({
  messages,
  employee,
  running,
}: {
  messages: ChatMessage[];
  employee?: AgentOption;
  running: boolean;
}) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <Avatar name={employee?.name} size="lg" />
        <div>
          <p className="text-text text-lg font-semibold">
            Ask {employee?.name ?? "your employee"} anything
          </p>
          <p className="text-text-muted text-sm">{employee?.role}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.map((message, i) => {
        const isUser = message.role === "user";
        const isStreamingPlaceholder = !isUser && running && i === messages.length - 1;
        const stepRows = message.stepEvents ? deriveStepRows(message.stepEvents) : [];
        return (
          <div
            key={i}
            className={cn("flex items-end gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}
          >
            {isUser ? null : <Avatar name={employee?.name} size="sm" className="shrink-0" />}
            <div className="max-w-lg">
              {!isUser && stepRows.length > 0 ? <StepEventsList rows={stepRows} /> : null}
              {message.content || message.error ? (
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                    isUser ? "bg-accent text-accent-contrast" : "bg-bg-subtle text-text",
                  )}
                >
                  {message.content || (isStreamingPlaceholder ? "…" : "")}
                </div>
              ) : isStreamingPlaceholder ? (
                <div className="bg-bg-subtle text-text rounded-2xl px-4 py-2.5 text-sm">…</div>
              ) : null}
              {!isUser && message.error ? (
                <ErrorBanner size="xs" className="mt-1.5">
                  ⚠️ {message.error}
                </ErrorBanner>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
