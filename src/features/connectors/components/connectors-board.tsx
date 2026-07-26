"use client";

import { Suspense, useState } from "react";
import { Button } from "@/ui";
import type { Connector } from "../types";
import { AddCustomConnectorDialog } from "./add-custom-connector-dialog";
import { ConnectRedirectToast } from "./connect-redirect-toast";
import { ConnectorCard } from "./connector-card";
import { ConnectorDetailDialog } from "./connector-detail-dialog";

export function ConnectorsBoard({ connectors }: { connectors: Connector[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const selected = connectors.find((c) => c.id === openId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={null}>
        <ConnectRedirectToast connectors={connectors} />
      </Suspense>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => setAddOpen(true)}>
          + Add custom connector
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {connectors.map((connector) => (
          <ConnectorCard
            key={connector.id}
            connector={connector}
            onOpen={() => setOpenId(connector.id)}
          />
        ))}
      </div>

      {selected ? (
        <ConnectorDetailDialog connector={selected} onClose={() => setOpenId(null)} />
      ) : null}
      {addOpen ? <AddCustomConnectorDialog onClose={() => setAddOpen(false)} /> : null}
    </div>
  );
}
