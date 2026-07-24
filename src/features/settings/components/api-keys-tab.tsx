"use client";

import { useState } from "react";
import { Button, Card, CardDescription, EmptyState, Input, Modal } from "@/ui";
import { INITIAL_API_KEYS } from "../fixtures";
import type { ApiKeyFixture } from "../types";

export function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKeyFixture[]>(INITIAL_API_KEYS);
  const [modalOpen, setModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");

  function createKey() {
    const id = crypto.randomUUID();
    const key: ApiKeyFixture = {
      id,
      name: newKeyName.trim() || "Untitled key",
      prefix: `rk_live_${id.replace(/-/g, "").slice(0, 8)}`,
      created: "Just now",
      lastUsed: "Never",
    };
    setKeys((prev) => [key, ...prev]);
    setNewKeyName("");
    setModalOpen(false);
  }

  function revoke(id: string) {
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-text-muted text-sm">
          Use these to call your employees from your own backend or third-party tools.
        </p>
        <Button onClick={() => setModalOpen(true)}>+ Create API key</Button>
      </div>

      <Card>
        {keys.length === 0 ? (
          <EmptyState
            title="No API keys yet"
            description="Create one to call your employees programmatically."
          />
        ) : (
          <ul className="divide-border divide-y">
            {keys.map((key) => (
              <li key={key.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="text-text truncate text-sm font-medium">{key.name}</p>
                  <p className="text-text-muted truncate font-mono text-xs">{key.prefix}••••••••</p>
                  <p className="text-text-faint mt-0.5 text-xs">
                    Created {key.created} · Last used {key.lastUsed}
                  </p>
                </div>
                <Button variant="danger" onClick={() => revoke(key.id)}>
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create API key">
        <CardDescription className="mb-0">
          Platform API access is a fixture until Phase 11 — this key won&apos;t actually work yet.
        </CardDescription>
        <label className="mt-4 grid gap-1 text-sm">
          <span className="text-text font-medium">Name</span>
          <Input
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="e.g. Production"
            autoFocus
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={createKey}>Create key</Button>
        </div>
      </Modal>
    </div>
  );
}
