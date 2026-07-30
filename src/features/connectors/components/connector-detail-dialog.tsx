"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Badge, Button, Input, Modal } from "@/ui";
import type { BadgeVariant } from "@/ui";
import type { Connector } from "../types";

const TRUST_COPY: Record<string, { label: string; variant: BadgeVariant; disclaimer: string }> = {
  verified: {
    label: "Verified",
    variant: "success",
    disclaimer: "This connector is maintained by a known vendor and reviewed by Roster.",
  },
  community: {
    label: "Community",
    variant: "accent",
    disclaimer:
      "This connector is publicly documented by its vendor but hasn't been independently verified by Roster. Review its permissions before connecting.",
  },
  custom: {
    label: "Custom",
    variant: "neutral",
    disclaimer: "You added this server yourself. Roster has no relationship with its operator.",
  },
};

function examplePrompts(connector: Connector): string[] {
  const firstTool = connector.cachedTools[0]?.name.replace(/-/g, " ");
  return [
    `Search my ${connector.name} for anything relevant to this`,
    firstTool ? `Use ${connector.name} to ${firstTool}` : `What can you do with ${connector.name}?`,
  ];
}

function HeaderRow({
  value,
  onChange,
  onRemove,
}: {
  value: { name: string; header: string };
  onChange: (next: { name: string; header: string }) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-2">
      <Input
        aria-label="Header name"
        placeholder="Header name (e.g. Authorization)"
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
      />
      <Input
        aria-label="Header value"
        placeholder="Value"
        value={value.header}
        onChange={(e) => onChange({ ...value, header: e.target.value })}
      />
      <Button type="button" variant="secondary" onClick={onRemove} aria-label="Remove header">
        ✕
      </Button>
    </div>
  );
}

export function ConnectorDetailDialog({
  connector,
  onClose,
}: {
  connector: Connector;
  onClose: () => void;
}) {
  const router = useRouter();
  const trust = TRUST_COPY[connector.trustTier] ?? TRUST_COPY.custom!;
  const [busy, setBusy] = useState(false);
  const [headerRows, setHeaderRows] = useState([{ name: "", header: "" }]);

  async function connectManually() {
    setBusy(true);
    try {
      const headers = Object.fromEntries(
        headerRows.filter((r) => r.name.trim() && r.header.trim()).map((r) => [r.name, r.header]),
      );
      const res = await fetch(`/api/mcp/connections/${connector.id}/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: "Couldn't connect",
          description: data?.error?.message,
          variant: "danger",
        });
        return;
      }
      toast({ title: `Connected to ${connector.name}`, variant: "success" });
      router.refresh();
      onClose();
    } catch {
      toast({ title: "Network error. Try again.", variant: "danger" });
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await fetch(`/api/mcp/connections/${connector.id}`, { method: "DELETE" });
      toast({ title: `Disconnected from ${connector.name}` });
      router.refresh();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} className="max-w-lg">
      <div className="flex items-start gap-3">
        <span className="bg-accent-soft text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-bold">
          {connector.name[0]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-text text-lg font-semibold">{connector.name}</h2>
            <Badge variant={trust.variant}>{trust.label}</Badge>
          </div>
          <p className="text-text-muted mt-0.5 text-sm">{connector.description}</p>
        </div>
      </div>

      <p className="text-text-muted bg-bg-subtle mt-4 rounded-lg p-3 text-xs">{trust.disclaimer}</p>

      <div className="mt-4">
        <p className="text-text text-sm font-medium">Example prompts</p>
        <ul className="mt-1 space-y-1">
          {examplePrompts(connector).map((p) => (
            <li key={p} className="text-text-muted text-sm italic">
              “{p}”
            </li>
          ))}
        </ul>
      </div>

      {connector.cachedTools.length > 0 ? (
        <div className="mt-4">
          <p className="text-text text-sm font-medium">Tools ({connector.cachedTools.length})</p>
          <ul className="mt-1 space-y-1">
            {connector.cachedTools.map((tool) => (
              <li key={tool.name} className="text-sm">
                <span className="text-text font-mono text-xs">{tool.name}</span>
                <span className="text-text-muted"> — {tool.description}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {connector.cachedResources.length > 0 ? (
        <div className="mt-4">
          <p className="text-text text-sm font-medium">
            Resources ({connector.cachedResources.length})
          </p>
          <ul className="mt-1 space-y-1">
            {connector.cachedResources.map((resource) => (
              <li key={resource.name} className="text-sm">
                <span className="text-text font-mono text-xs">{resource.name}</span>
                <span className="text-text-muted"> — {resource.description}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {connector.categories.length > 0 ? (
        <div className="mt-4">
          <p className="text-text text-sm font-medium">Categories</p>
          <p className="text-text-muted mt-1 text-sm">{connector.categories.join(", ")}</p>
        </div>
      ) : null}

      <div className="border-border mt-4 grid gap-1 border-t pt-4 text-sm">
        {connector.developer ? (
          <p>
            <span className="text-text-muted">Author: </span>
            <span className="text-text">{connector.developer}</span>
          </p>
        ) : null}
        <p>
          <span className="text-text-muted">Auth: </span>
          <span className="text-text">
            {connector.authType === "oauth_dcr"
              ? "OAuth 2.1"
              : connector.authType === "static_headers"
                ? "Custom headers"
                : "None"}
          </span>
        </p>
        <p className="truncate">
          <span className="text-text-muted">Connector URL: </span>
          <span className="text-text font-mono text-xs">{connector.connectorUrl}</span>
        </p>
      </div>

      {connector.documentationUrl || connector.supportUrl || connector.privacyPolicyUrl ? (
        <div className="mt-4 flex gap-4 text-sm">
          {connector.documentationUrl ? (
            <a
              href={connector.documentationUrl}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              Documentation
            </a>
          ) : null}
          {connector.supportUrl ? (
            <a
              href={connector.supportUrl}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              Support
            </a>
          ) : null}
          {connector.privacyPolicyUrl ? (
            <a
              href={connector.privacyPolicyUrl}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              Privacy Policy
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="border-border mt-6 border-t pt-4">
        {connector.connected ? (
          <Button variant="secondary" onClick={disconnect} disabled={busy}>
            {busy ? "Disconnecting…" : "Disconnect"}
          </Button>
        ) : connector.authType === "oauth_dcr" ? (
          <Button
            onClick={() => {
              window.location.href = `/api/mcp/oauth/${connector.id}/start`;
            }}
          >
            Connect
          </Button>
        ) : connector.authType === "static_headers" ? (
          <div className="flex flex-col gap-2">
            <p className="text-text text-sm font-medium">Headers</p>
            {headerRows.map((row, i) => (
              <HeaderRow
                key={i}
                value={row}
                onChange={(next) =>
                  setHeaderRows((rows) => rows.map((r, j) => (j === i ? next : r)))
                }
                onRemove={() => setHeaderRows((rows) => rows.filter((_, j) => j !== i))}
              />
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setHeaderRows((rows) => [...rows, { name: "", header: "" }])}
            >
              + Add header
            </Button>
            <Button onClick={connectManually} disabled={busy}>
              {busy ? "Connecting…" : "Connect"}
            </Button>
          </div>
        ) : (
          <Button onClick={connectManually} disabled={busy}>
            {busy ? "Connecting…" : "Connect"}
          </Button>
        )}
      </div>
    </Modal>
  );
}
