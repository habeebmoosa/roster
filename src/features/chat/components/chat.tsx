"use client";

import { useState } from "react";
import { getProvider } from "@/core/providers/catalog";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/ui";
import { useChatStream } from "../hooks/use-chat-stream";
import type { AgentOption, ConversationSummary } from "../types";
import { ChatComposer } from "./chat-composer";
import { ChatThread } from "./chat-thread";
import { EmployeeSwitcher } from "./employee-switcher";
import { HistoryDrawer } from "./history-drawer";

export function Chat({
  agents,
  configured,
  conversations,
}: {
  agents: AgentOption[];
  configured: string[];
  conversations: ConversationSummary[];
}) {
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [provider, setProvider] = useState(configured[0] ?? "");
  const [model, setModel] = useState(getProvider(configured[0] ?? "")?.suggestedModels[0] ?? "");
  const [historyOpen, setHistoryOpen] = useState(false);

  const { messages, running, error, send, clear, loadConversation } = useChatStream({
    agentId,
    provider,
    model,
  });
  const employee = agents.find((a) => a.id === agentId);

  function onProviderChange(id: string) {
    setProvider(id);
    setModel(getProvider(id)?.suggestedModels[0] ?? "");
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
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={clear}>
            New chat
          </Button>
          <Button variant="secondary" onClick={() => setHistoryOpen(true)}>
            History
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto p-6">
        <ChatThread messages={messages} employee={employee} running={running} />
      </div>

      <div className="border-border border-t p-4">
        <ChatComposer
          provider={provider}
          model={model}
          configured={configured}
          onProviderChange={onProviderChange}
          onModelChange={setModel}
          onSend={send}
          running={running}
          error={error}
        />
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
