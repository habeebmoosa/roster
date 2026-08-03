import { Avatar, ErrorBanner, Markdown } from "@/ui";
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
    <div className="flex flex-col gap-6">
      {messages.map((message, i) => {
        const isUser = message.role === "user";
        const isStreamingPlaceholder = !isUser && running && i === messages.length - 1;
        const stepRows = message.stepEvents ? deriveStepRows(message.stepEvents) : [];

        if (isUser) {
          return (
            <div key={i} className="flex justify-end">
              <div className="bg-accent text-accent-contrast max-w-lg rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap">
                {message.content}
              </div>
            </div>
          );
        }

        return (
          <div key={i} className="flex flex-col gap-1.5">
            {stepRows.length > 0 ? <StepEventsList rows={stepRows} /> : null}
            {message.content ? (
              <Markdown>{message.content}</Markdown>
            ) : isStreamingPlaceholder ? (
              <p className="text-text text-sm">…</p>
            ) : null}
            {message.error ? (
              <ErrorBanner size="xs" className="mt-1.5">
                ⚠️ {message.error}
              </ErrorBanner>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
