import { Badge, Card } from "@/ui";
import type { BadgeVariant } from "@/ui";
import type { Connector } from "../types";

const TRUST_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  verified: { label: "Verified", variant: "success" },
  community: { label: "Community", variant: "accent" },
  custom: { label: "Custom", variant: "neutral" },
};

export function ConnectorCard({ connector, onOpen }: { connector: Connector; onOpen: () => void }) {
  const trust = TRUST_BADGE[connector.trustTier] ?? TRUST_BADGE.custom!;

  return (
    <Card
      className="flex cursor-pointer items-start gap-3 text-left"
      data-testid={`connector-${connector.id}`}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <span className="bg-accent-soft text-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
        {connector.name[0]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-text truncate text-sm font-semibold">{connector.name}</p>
          <Badge variant={trust.variant}>{trust.label}</Badge>
          {connector.connected ? <Badge variant="success">Connected</Badge> : null}
        </div>
        <p className="text-text-muted mt-0.5 line-clamp-2 text-sm">{connector.description}</p>
        {connector.categories.length > 0 ? (
          <p className="text-text-muted mt-1 text-xs">{connector.categories.join(" · ")}</p>
        ) : null}
      </div>
    </Card>
  );
}
