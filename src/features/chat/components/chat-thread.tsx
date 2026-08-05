import type { ReactNode } from "react";
import type { MessagePart } from "@/core/agent";
import { Avatar, ErrorBanner, Markdown, TypingIndicator } from "@/ui";
import { deriveStepRows } from "../step-rows";
import type { AgentOption, ChatMessage } from "../types";
import { ReasoningBlock } from "./reasoning-block";
import { StepEventsList } from "./step-events-list";
import { ToolCallChip } from "./tool-call-chip";

/** An empty text part renders nothing — used to decide whether the typing indicator should still show instead. */
function isRenderable(part: MessagePart): boolean {
  return part.type !== "text" || part.text.length > 0;
}

function AssistantBody({
  message,
  isStreamingPlaceholder,
}: {
  message: ChatMessage;
  isStreamingPlaceholder: boolean;
}): ReactNode {
  const renderableParts = (message.parts ?? []).filter(isRenderable);

  if (renderableParts.length > 0) {
    return (
      <>
        {renderableParts.map((part, i) => {
          if (part.type === "reasoning") return <ReasoningBlock key={i} part={part} />;
          if (part.type === "tool-call") return <ToolCallChip key={i} part={part} />;
          return <Markdown key={i}>{part.text}</Markdown>;
        })}
      </>
    );
  }

  // Messages that predate the parts model (11.x follow-up) only ever have `content`.
  if (message.content) return <Markdown>{message.content}</Markdown>;
  if (isStreamingPlaceholder) return <TypingIndicator />;
  return null;
}

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
            <AssistantBody message={message} isStreamingPlaceholder={isStreamingPlaceholder} />
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
