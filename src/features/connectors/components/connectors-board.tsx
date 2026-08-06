"use client";

import { Suspense, useMemo, useState } from "react";
import { Button, EmptyState, Tabs, TabsList, TabsPanel, TabsTrigger } from "@/ui";
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

  const builtIn = useMemo(() => connectors.filter((c) => c.trustTier !== "custom"), [connectors]);
  const custom = useMemo(() => connectors.filter((c) => c.trustTier === "custom"), [connectors]);

  const categories = useMemo(
    () => [...new Set(builtIn.flatMap((c) => c.categories))].sort(),
    [builtIn],
  );
  const filteredBuiltIn =
    selectedCategory === null
      ? builtIn
      : builtIn.filter((c) => c.categories.includes(selectedCategory));

  const selected = connectors.find((c) => c.id === openId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={null}>
        <ConnectRedirectToast connectors={connectors} />
      </Suspense>

      <Tabs defaultValue="built-in">
        <TabsList>
          <TabsTrigger value="built-in">Built-in ({builtIn.length})</TabsTrigger>
          <TabsTrigger value="custom">Custom ({custom.length})</TabsTrigger>
        </TabsList>

        <TabsPanel value="built-in" className="mt-4 flex flex-col gap-4">
          {categories.length > 0 ? (
            <ConnectorCategoryFilter
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          ) : null}

          {builtIn.length === 0 ? (
            <EmptyState
              title="No connectors available"
              description="The MCP connector directory is empty right now — check back later."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {filteredBuiltIn.map((connector) => (
                <ConnectorCard
                  key={connector.id}
                  connector={connector}
                  onOpen={() => setOpenId(connector.id)}
                />
              ))}
            </div>
          )}
        </TabsPanel>

        <TabsPanel value="custom" className="mt-4 flex flex-col gap-4">
          {custom.length === 0 ? (
            <EmptyState
              title="No custom connectors yet"
              description="Add your own MCP server by URL to connect it to your employees."
              action={<Button onClick={() => setAddOpen(true)}>+ Add custom connector</Button>}
            />
          ) : (
            <>
              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => setAddOpen(true)}>
                  + Add custom connector
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {custom.map((connector) => (
                  <ConnectorCard
                    key={connector.id}
                    connector={connector}
                    onOpen={() => setOpenId(connector.id)}
                  />
                ))}
              </div>
            </>
          )}
        </TabsPanel>
      </Tabs>

      {selected ? (
        <ConnectorDetailDialog connector={selected} onClose={() => setOpenId(null)} />
      ) : null}
      {addOpen ? <AddCustomConnectorDialog onClose={() => setAddOpen(false)} /> : null}
    </div>
  );
}
