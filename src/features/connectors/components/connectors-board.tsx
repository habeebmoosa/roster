"use client";

import { useState } from "react";
import { CardTitle } from "@/ui";
import { DEFAULT_CONNECTED_IDS } from "../fixtures";
import type { ConnectorGroup } from "../types";
import { ConnectorCard } from "./connector-card";

export function ConnectorsBoard({ groups }: { groups: ConnectorGroup[] }) {
  const [connectedIds, setConnectedIds] = useState<Set<string>>(
    () => new Set(DEFAULT_CONNECTED_IDS),
  );

  function toggle(id: string) {
    setConnectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.category}>
          <CardTitle className="mb-3">{group.category}</CardTitle>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {group.items.map((connector) => (
              <ConnectorCard
                key={connector.id}
                connector={connector}
                connected={connectedIds.has(connector.id)}
                onToggle={() => toggle(connector.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
