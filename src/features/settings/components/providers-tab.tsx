"use client";

import { useState } from "react";
import { getProvider } from "@/core/providers/catalog";
import {
  AddProviderDialog,
  ManageCredentialsDialog,
  ProviderLogo,
} from "@/features/providers";
import type { ProviderKeyRecord } from "@/server/db/repositories/provider-key.repository";
import { Button, Card, CardDescription, CardTitle } from "@/ui";

export function ProvidersTab({
  credentialsByProvider,
}: {
  credentialsByProvider: Record<string, ProviderKeyRecord[]>;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [manageProviderId, setManageProviderId] = useState<string | null>(null);

  const configuredIds = Object.keys(credentialsByProvider);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-text-muted text-sm">
        Bring your own key. Encrypted at rest, decrypted only when a request runs.
      </p>

      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Configured providers</CardTitle>
          <Button onClick={() => setAddOpen(true)}>+ Add provider</Button>
        </div>

        {configuredIds.length === 0 ? (
          <CardDescription>No providers yet. Add one to get started.</CardDescription>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {configuredIds.map((id) => {
              const entry = getProvider(id);
              if (!entry) return null;
              const credentials = credentialsByProvider[id]!;
              const defaultCredential = credentials.find((c) => c.isDefault);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setManageProviderId(id)}
                  className="border-border bg-bg-elevated hover:bg-bg-subtle flex items-center gap-3 rounded-xl border p-3 text-left transition"
                >
                  <ProviderLogo id={entry.id} label={entry.label} className="h-10 w-10" />
                  <div className="min-w-0">
                    <p className="text-text truncate text-sm font-semibold">{entry.label}</p>
                    <p className="text-text-muted truncate text-xs">
                      {credentials.length} credential{credentials.length === 1 ? "" : "s"}
                      {defaultCredential ? ` · default: ${defaultCredential.label}` : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {addOpen ? <AddProviderDialog onClose={() => setAddOpen(false)} /> : null}
      {manageProviderId ? (
        (() => {
          const entry = getProvider(manageProviderId);
          const credentials = credentialsByProvider[manageProviderId];
          if (!entry || !credentials) return null;
          return (
            <ManageCredentialsDialog
              provider={entry}
              credentials={credentials}
              onClose={() => setManageProviderId(null)}
            />
          );
        })()
      ) : null}
    </div>
  );
}
