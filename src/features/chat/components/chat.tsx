"use client";

import { useState } from "react";
import { getProvider } from "@/core/providers/catalog";
import { toast } from "@/hooks/use-toast";
import type { ProviderKeyRecord } from "@/server/db/repositories/provider-key.repository";
import { IconHistory, IconNewChat, Tooltip } from "@/ui";
import { useChatStream } from "../hooks/use-chat-stream";
import type { AgentOption, ConversationSummary } from "../types";
import { ChatComposer } from "./chat-composer";
import { ChatThread } from "./chat-thread";
import { EmployeeSwitcher } from "./employee-switcher";
import { HistoryDrawer } from "./history-drawer";

export function Chat({
  agents,
  providerKeys,
  conversations,
  initialAgentId,
}: {
  agents: AgentOption[];
  providerKeys: ProviderKeyRecord[];
  conversations: ConversationSummary[];
  /** Pre-selects an employee, e.g. arriving from the hire wizard via `/chat?agentId=...`. Falls back to the first agent if unknown. */
  initialAgentId?: string;
}) {
  const [agentId, setAgentId] = useState(
    initialAgentId && agents.some((a) => a.id === initialAgentId)
      ? initialAgentId
      : (agents[0]?.id ?? ""),
  );
  const [provider, setProvider] = useState(providerKeys[0]?.provider ?? "");
  const [model, setModel] = useState(getProvider(providerKeys[0]?.provider ?? "")?.suggestedModels[0] ?? "");
  const [historyOpen, setHistoryOpen] = useState(false);

  const { messages, running, error, send, clear, loadConversation } = useChatStream({
    agentId,
    provider,
    model,
  });
  const employee = agents.find((a) => a.id === agentId);

  function onModelSelect(nextProvider: string, nextModel: string) {
    setProvider(nextProvider);
    setModel(nextModel);
  }

  function onSwitchEmployee(id: string) {
    setAgentId(id);
    clear();
  }

  async function onSelectHistory(conversationId: string) {
    setHistoryOpen(false);
    try {
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast({
          title: "Couldn't open that conversation",
          description: data?.error?.message,
          variant: "danger",
        });
        return;
      }
      const { conversation } = await res.json();
      setAgentId(conversation.agentId);
      loadConversation(conversation.id, conversation.messages);
    } catch {
      toast({ title: "Network error. Try again.", variant: "danger" });
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex items-center justify-between border-b p-3">
        <EmployeeSwitcher agents={agents} currentId={agentId} onSelect={onSwitchEmployee} />
        <div className="flex items-center gap-1">
          <Tooltip label="New chat" side="bottom">
            <button
              type="button"
              onClick={clear}
              aria-label="New chat"
              className="text-text-muted hover:bg-bg-subtle hover:text-text flex h-9 w-9 items-center justify-center rounded-full transition-colors"
            >
              <IconNewChat className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip label="History" side="bottom">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              aria-label="History"
              className="text-text-muted hover:bg-bg-subtle hover:text-text flex h-9 w-9 items-center justify-center rounded-full transition-colors"
            >
              <IconHistory className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* The scroll container spans full width so its scrollbar sits at the
          true right edge (ChatGPT/Claude-style) — the mx-60 centering lives
          on an inner wrapper instead, not the scrollable element itself. */}
      <div className="flex flex-1 flex-col overflow-y-auto p-6">
        <div className="mx-60">
          <ChatThread messages={messages} employee={employee} running={running} />
        </div>
      </div>

      <div className="p-4 pt-0">
        <div className="mx-60">
          <ChatComposer
            provider={provider}
            model={model}
            providerKeys={providerKeys}
            onModelSelect={onModelSelect}
            onSend={send}
            running={running}
            error={error}
          />
        </div>
      </div>

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        conversations={conversations}
        onSelect={onSelectHistory}
      />
    </div>
  );
}
