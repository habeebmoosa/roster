import Link from "next/link";
import { trustTierCopy } from "@/features/connectors/trust";
import type { McpServerListItem } from "@/server/mcp/connect-service";
import { Badge, CardDescription, CardTitle, EmptyState, Switch } from "@/ui";

// Only the user's already-connected servers are selectable — enabling one that
// isn't connected would do nothing at runtime (resolveMcpToolsForAgent
// requires an active connection too). Connecting a new server needs a
// full-page OAuth redirect, so this step just links out to /connectors
// instead of embedding a connect flow.
export function StepConnectors({
  connectors,
  selected,
  onToggle,
}: {
  connectors: McpServerListItem[];
  selected: string[];
  onToggle: (serverId: string) => void;
}) {
  return (
    <div>
      <CardTitle>Connectors</CardTitle>
      <CardDescription>Choose which of your connected tools this employee can use.</CardDescription>

      {connectors.length === 0 ? (
        <EmptyState
          className="mt-4 border-none p-6"
          title="No connectors connected yet"
          description="You can always add connectors later from the employee's detail page."
          action={
            <Link href="/connectors" className="text-accent text-sm font-medium hover:underline">
              Go to Connectors →
            </Link>
          }
        />
      ) : (
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
                  checked={selected.includes(connector.id)}
                  onCheckedChange={() => onToggle(connector.id)}
                  aria-label={connector.name}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
