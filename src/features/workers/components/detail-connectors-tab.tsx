"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { trustTierCopy } from "@/features/connectors/trust";
import { toast } from "@/hooks/use-toast";
import type { AgentConnectorOption } from "@/server/mcp/connect-service";
import { Badge, Card, CardDescription, CardTitle, EmptyState, Switch } from "@/ui";

export interface DetailConnectorsTabProps {
  agentId: string;
  /** Only the user's *connected* servers, each annotated with whether this agent has it turned on — see listAgentConnectors. */
  connectors: AgentConnectorOption[];
}

export function DetailConnectorsTab({ agentId, connectors }: DetailConnectorsTabProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function onToggle(serverId: string, currentlyEnabled: boolean) {
    setPendingId(serverId);
    try {
      const res = await fetch(`/api/agents/${agentId}/connectors/${serverId}`, {
        method: currentlyEnabled ? "DELETE" : "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast({ title: data?.error?.message ?? "Something went wrong.", variant: "danger" });
        return;
      }
      toast({
        title: currentlyEnabled ? "Connector disabled" : "Connector enabled",
        variant: "success",
      });
      router.refresh();
    } catch {
      toast({ title: "Network error. Try again.", variant: "danger" });
    } finally {
      setPendingId(null);
    }
  }

  if (connectors.length === 0) {
    return (
      <Card>
        <CardTitle>Connectors</CardTitle>
        <EmptyState
          className="mt-3 border-none p-6"
          title="No connectors connected yet"
          description="Connect an MCP server before assigning it to this employee."
          action={
            <Link href="/connectors" className="text-accent text-sm font-medium hover:underline">
              Go to Connectors →
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>Connectors</CardTitle>
      <CardDescription>Choose which of your connected tools this employee can use.</CardDescription>

      <ul className="divide-border mt-4 divide-y">
        {connectors.map((connector) => {
          const trust = trustTierCopy(connector.trustTier);
          return (
            <li key={connector.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-text truncate text-sm font-medium">{connector.name}</p>
                  <Badge variant={trust.variant}>{trust.label}</Badge>
                </div>
                <p className="text-text-muted mt-0.5 line-clamp-2 text-sm">{connector.description}</p>
                {connector.trustTier !== "verified" ? (
                  <p className="text-text-faint mt-1 text-xs">{trust.disclaimer}</p>
                ) : null}
              </div>
              <Switch
                checked={connector.enabled}
                onCheckedChange={() => onToggle(connector.id, connector.enabled)}
                disabled={pendingId === connector.id}
                aria-label={connector.name}
              />
            </li>
          );
        })}
      </ul>

      <Link href="/connectors" className="text-accent mt-4 inline-block text-sm font-medium hover:underline">
        Manage connectors →
      </Link>
    </Card>
  );
}
