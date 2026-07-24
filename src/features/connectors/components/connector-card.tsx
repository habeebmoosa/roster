import { Badge, Button, Card } from "@/ui";
import type { Connector } from "../types";

export function ConnectorCard({
  connector,
  connected,
  onToggle,
}: {
  connector: Connector;
  connected: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="flex items-start gap-3" data-testid={`connector-${connector.id}`}>
      <span className="bg-accent-soft text-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
        {connector.name[0]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-text truncate text-sm font-semibold">{connector.name}</p>
          {connected ? <Badge variant="success">Connected</Badge> : null}
        </div>
        <p className="text-text-muted mt-0.5 text-sm">{connector.description}</p>
      </div>
      <Button variant="secondary" onClick={onToggle} className="shrink-0">
        {connected ? "Manage" : "Connect"}
      </Button>
    </Card>
  );
}
