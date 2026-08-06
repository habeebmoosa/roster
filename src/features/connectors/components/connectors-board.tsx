"use client";

import { Suspense, useMemo, useState } from "react";
import { Button, EmptyState } from "@/ui";
import type { Connector } from "../types";
import { AddCustomConnectorDialog } from "./add-custom-connector-dialog";
import { ConnectRedirectToast } from "./connect-redirect-toast";
import { ConnectorCard } from "./connector-card";
import { ConnectorCategoryFilter } from "./connector-category-filter";
import { ConnectorDetailDialog } from "./connector-detail-dialog";

export function ConnectorsBoard({ connectors }: { connectors: Connector[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(connectors.flatMap((c) => c.categories))].sort(),
    [connectors],
  );
  const filtered =
    selectedCategory === null
      ? connectors
      : connectors.filter((c) => c.categories.includes(selectedCategory));

  const selected = connectors.find((c) => c.id === openId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={null}>
        <ConnectRedirectToast connectors={connectors} />
      </Suspense>

      <div className="flex items-start justify-between gap-4">
        {categories.length > 0 ? (
          <ConnectorCategoryFilter
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        ) : (
          <div />
        )}
        <Button variant="secondary" onClick={() => setAddOpen(true)} className="shrink-0">
          + Add custom connector
        </Button>
      </div>

      {connectors.length === 0 ? (
        <EmptyState
          title="No connectors available"
          description="The MCP connector directory is empty right now — check back later or add a custom server above."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((connector) => (
            <ConnectorCard
              key={connector.id}
              connector={connector}
              onOpen={() => setOpenId(connector.id)}
            />
          ))}
        </div>
      )}

      {selected ? (
        <ConnectorDetailDialog connector={selected} onClose={() => setOpenId(null)} />
      ) : null}
      {addOpen ? <AddCustomConnectorDialog onClose={() => setAddOpen(false)} /> : null}
    </div>
  );
}
