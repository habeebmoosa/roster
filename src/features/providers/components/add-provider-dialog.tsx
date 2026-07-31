"use client";

import { useState } from "react";
import type { ProviderCatalogEntry } from "@/core/providers/catalog";
import { IconClose, Modal } from "@/ui";
import { CredentialForm } from "./credential-form";
import { ProviderPickerGrid } from "./provider-picker-grid";

/** Two-step "Add a provider" flow: pick a provider, then fill in its credential fields. */
export function AddProviderDialog({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<ProviderCatalogEntry | null>(null);

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

      {selected ? (
        <CredentialForm provider={selected} onBack={() => setSelected(null)} onClose={onClose} />
      ) : (
        <ProviderPickerGrid onSelect={setSelected} />
      )}
    </Modal>
  );
}
