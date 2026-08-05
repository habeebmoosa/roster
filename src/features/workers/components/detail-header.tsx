"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import type { AgentStatus } from "@/server/db/repositories/agent.repository";
import { Avatar, Badge, Button, Card } from "@/ui";
import { agentStatusBadge } from "../status-badge";

/**
 * Pausing/resuming never touches the agent's definition, knowledge,
 * connectors, or conversation history — it only blocks new chat turns
 * (streamAgentChat throws AgentPausedError). No confirmation dialog: unlike
 * a destructive action, this is instantly reversible.
 */
export function DetailHeader({
  agentId,
  name,
  role,
  status,
}: {
  agentId: string;
  name: string;
  role: string;
  status: AgentStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const badge = agentStatusBadge(status);

  async function toggleStatus() {
    const nextStatus: AgentStatus = status === "active" ? "paused" : "active";
    setPending(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast({ title: data?.error?.message ?? "Something went wrong.", variant: "danger" });
        return;
      }
      toast({
        title: nextStatus === "paused" ? "Employee paused" : "Employee resumed",
        variant: "success",
      });
      router.refresh();
    } catch {
      toast({ title: "Network error. Try again.", variant: "danger" });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="flex items-center gap-4">
      <Avatar name={name} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="text-text truncate text-xl font-bold tracking-tight">{name}</h1>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <p className="text-text-muted mt-0.5 text-sm">{role}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" onClick={toggleStatus} disabled={pending}>
          {status === "active" ? "Pause" : "Resume"}
        </Button>
        {/* Edit isn't wired to anything yet — no edit-agent flow exists. */}
        <span
          className="text-text-faint border-border cursor-not-allowed rounded-md border px-4 py-2 text-sm font-medium"
          title="Coming soon"
        >
          Edit
        </span>
      </div>
    </Card>
  );
}
