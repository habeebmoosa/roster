"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import type { ProviderCatalogEntry } from "@/core/providers/catalog";
import type { ProviderKeyRecord } from "@/server/db/repositories/provider-key.repository";
import { Badge, Button, IconClose, Modal } from "@/ui";
import { CredentialForm } from "./credential-form";
import { ProviderLogo } from "./provider-logo";

/** Every non-secret field's value, joined for a compact one-line summary — never a fragment of the secret itself. */
function credentialSummary(provider: ProviderCatalogEntry, credential: ProviderKeyRecord): string {
  const parts: string[] = [];
  for (const field of provider.fields) {
    if (field.kind === "secret") continue;
    const value = credential.config[field.key];
    if (typeof value === "string" && value) parts.push(`${field.label}: ${value}`);
  }
  if (credential.baseUrl) parts.push(credential.baseUrl);
  return parts.join(" · ") || "Connected";
}

export function ManageCredentialsDialog({
  provider,
  credentials,
  onClose,
}: {
  provider: ProviderCatalogEntry;
  credentials: ProviderKeyRecord[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ProviderKeyRecord | null>(null);
  const [addingAnother, setAddingAnother] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleSetDefault(credential: ProviderKeyRecord) {
    setBusyId(credential.id);
    try {
      await fetch(`/api/providers/${provider.id}/credentials/${credential.id}/default`, {
        method: "POST",
      });
      toast({ title: `"${credential.label}" is now the default`, variant: "success" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(credential: ProviderKeyRecord) {
    setBusyId(credential.id);
    try {
      await fetch(`/api/providers/${provider.id}/credentials/${credential.id}`, { method: "DELETE" });
      toast({ title: `Removed "${credential.label}"` });
      router.refresh();
      if (credentials.length <= 1) onClose();
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemoveProviderEntirely() {
    setBusyId("__all__");
    try {
      await fetch(`/api/providers/${provider.id}`, { method: "DELETE" });
      toast({ title: `Disconnected ${provider.label}` });
      router.refresh();
      onClose();
    } finally {
      setBusyId(null);
    }
  }

  if (editing) {
    return (
      <Modal open onClose={() => setEditing(null)} size="panel">
        <CredentialForm provider={provider} existing={editing} onClose={() => setEditing(null)} />
      </Modal>
    );
  }

  if (addingAnother) {
    return (
      <Modal open onClose={() => setAddingAnother(false)} size="panel">
        <CredentialForm
          provider={provider}
          hasExistingCredentials
          onClose={() => setAddingAnother(false)}
        />
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} size="panel">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="text-text-faint hover:text-text bg-bg-elevated/80 absolute top-4 right-4 z-10 rounded-full p-1.5 backdrop-blur transition"
      >
        <IconClose className="h-5 w-5" />
      </button>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-3">
            <ProviderLogo id={provider.id} label={provider.label} className="h-12 w-12" />
            <div>
              <h2 className="text-text text-lg font-semibold">{provider.label}</h2>
              <p className="text-text-muted text-sm">
                {credentials.length} credential{credentials.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <ul className="divide-border mt-6 divide-y">
            {credentials.map((credential) => (
              <li key={credential.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-text truncate text-sm font-semibold">{credential.label}</p>
                    {credential.isDefault ? <Badge variant="accent">Default</Badge> : null}
                  </div>
                  <p className="text-text-muted truncate text-sm">
                    {credentialSummary(provider, credential)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!credential.isDefault ? (
                    <Button
                      variant="secondary"
                      onClick={() => handleSetDefault(credential)}
                      disabled={busyId === credential.id}
                    >
                      Set as default
                    </Button>
                  ) : null}
                  <Button variant="secondary" onClick={() => setEditing(credential)}>
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleRemove(credential)}
                    disabled={busyId === credential.id}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between">
            <Button variant="secondary" onClick={() => setAddingAnother(true)}>
              + Add another credential
            </Button>
            <Button
              variant="danger"
              onClick={handleRemoveProviderEntirely}
              disabled={busyId === "__all__"}
            >
              Remove provider entirely
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
