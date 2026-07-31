"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import {
  Badge,
  Button,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconCopy,
  IconExternalLink,
  IconLink,
  Input,
  Modal,
} from "@/ui";
import type { BadgeVariant } from "@/ui";
import type { Connector, ConnectorCapability } from "../types";

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

const AUTH_LABEL: Record<string, string> = {
  oauth_dcr: "OAuth 2.1",
  static_headers: "Custom headers",
  none: "None",
};

interface ExampleCard {
  prompt: string;
  tool: ConnectorCapability | null;
}

function exampleCards(connector: Connector): ExampleCard[] {
  const tools = connector.cachedTools;
  if (tools.length === 0) {
    return [{ prompt: `What can you do with ${connector.name}?`, tool: null }];
  }
  const cards: ExampleCard[] = [
    { prompt: `Search my ${connector.name} for anything relevant to this`, tool: tools[0]! },
  ];
  // Skip tools[0] — it's already showcased in the generic "search" card above.
  for (const tool of tools.slice(1, 3)) {
    cards.push({ prompt: `Use ${connector.name} to ${tool.name.replace(/-/g, " ")}`, tool });
  }
  return cards;
}

function PillList({
  items,
  render,
  limit = 8,
}: {
  items: string[];
  render: (item: string) => React.ReactNode;
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, limit);
  const hidden = items.length - visible.length;

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((item) => (
        <span key={item}>{render(item)}</span>
      ))}
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="bg-bg-subtle text-text-muted hover:text-text rounded-full px-3 py-1.5 text-sm font-medium transition"
        >
          +{hidden} more
        </button>
      ) : null}
    </div>
  );
}

function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <h3 className="text-text text-base font-semibold">{title}</h3>
      <span className="bg-bg-subtle text-text-muted flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold">
        {count}
      </span>
    </div>
  );
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
  const carouselRef = useRef<HTMLDivElement>(null);

  function scrollCarousel(direction: 1 | -1) {
    carouselRef.current?.scrollBy({ left: direction * 300, behavior: "smooth" });
  }

  async function copyConnectorUrl() {
    try {
      await navigator.clipboard.writeText(connector.connectorUrl);
      toast({ title: "Connector URL copied", variant: "success" });
    } catch {
      toast({ title: "Couldn't copy — select and copy manually.", variant: "danger" });
    }
  }

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

  const capabilities = [
    ...(connector.cachedTools.length > 0 ? ["Tools"] : []),
    ...(connector.cachedResources.length > 0 ? ["Resources"] : []),
  ];
  const moreInfoLinks = [
    { label: "Documentation", href: connector.documentationUrl },
    { label: "Support", href: connector.supportUrl },
    { label: "Privacy Policy", href: connector.privacyPolicyUrl },
  ].filter((l): l is { label: string; href: string } => Boolean(l.href));

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

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text flex items-center gap-1 text-sm"
          >
            <IconChevronLeft className="h-4 w-4" />
            Back
          </button>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="bg-accent-soft text-accent flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xl font-bold">
                {connector.name[0]}
              </span>
              <div className="min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-text text-xl font-semibold">{connector.name}</h2>
                  <Badge variant={trust.variant}>{trust.label}</Badge>
                </div>
                <p className="text-text-muted mt-1 text-sm">{connector.description}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={copyConnectorUrl}
                aria-label="Copy connector URL"
                title="Copy connector URL"
                className="border-border text-text-muted hover:text-text hover:bg-bg-subtle rounded-lg border p-2 transition"
              >
                <IconLink className="h-4 w-4" />
              </button>
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
              ) : connector.authType === "none" ? (
                <Button onClick={connectManually} disabled={busy}>
                  {busy ? "Connecting…" : "Connect"}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-8">
            <div
              ref={carouselRef}
              className="flex snap-x gap-4 overflow-x-auto scroll-smooth pb-1"
            >
              {exampleCards(connector).map((card) => (
                <div
                  key={card.prompt}
                  className="flex w-64 shrink-0 snap-start flex-col gap-3"
                >
                  <div className="bg-bg-elevated border-border rounded-xl border px-4 py-2.5 shadow-sm">
                    <p className="text-text text-sm italic">“{card.prompt}”</p>
                  </div>
                  <div className="border-border bg-bg-subtle rounded-xl border p-4">
                    {card.tool ? (
                      <>
                        <p className="text-text font-mono text-xs font-semibold">{card.tool.name}</p>
                        <p className="text-text-muted mt-1 line-clamp-3 text-xs">
                          {card.tool.description}
                        </p>
                      </>
                    ) : (
                      <p className="text-text-faint text-xs">No tools reported yet.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => scrollCarousel(-1)}
                aria-label="Scroll examples left"
                className="border-border text-text-muted hover:text-text rounded-full border p-1.5 transition"
              >
                <IconChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollCarousel(1)}
                aria-label="Scroll examples right"
                className="border-border text-text-muted hover:text-text rounded-full border p-1.5 transition"
              >
                <IconChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-8">
            {connector.developer ? (
              <p className="text-text text-sm">
                Developed by <span className="font-medium">{connector.developer}</span>
              </p>
            ) : null}
            <p className="text-text-faint mt-1 text-sm">{trust.disclaimer}</p>
          </div>

          {connector.cachedTools.length > 0 ? (
            <div className="mt-8">
              <SectionHeading title="Tools" count={connector.cachedTools.length} />
              <div className="mt-3">
                <PillList
                  items={connector.cachedTools.map((t) => t.name)}
                  render={(name) => (
                    <span className="bg-bg-subtle text-text rounded-full px-3 py-1.5 font-mono text-sm">
                      {name}
                    </span>
                  )}
                />
              </div>
            </div>
          ) : null}

          {connector.cachedResources.length > 0 ? (
            <div className="mt-8">
              <SectionHeading title="Resources" count={connector.cachedResources.length} />
              <div className="mt-3">
                <PillList
                  items={connector.cachedResources.map((r) => r.name)}
                  render={(name) => (
                    <span className="bg-bg-subtle text-text rounded-full px-3 py-1.5 font-mono text-sm">
                      {name}
                    </span>
                  )}
                />
              </div>
            </div>
          ) : null}

          {connector.categories.length > 0 ? (
            <div className="mt-8">
              <SectionHeading title="Categories" count={connector.categories.length} />
              <div className="mt-3">
                <PillList
                  items={connector.categories}
                  render={(category) => (
                    <span className="bg-accent-soft text-accent rounded-full px-3 py-1.5 text-sm font-medium">
                      {category}
                    </span>
                  )}
                />
              </div>
            </div>
          ) : null}

          <hr className="border-border mt-8" />

          <div className="mt-6">
            <h3 className="text-text text-base font-semibold">Details</h3>
            <div className="mt-4 grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="flex flex-col gap-4 text-sm">
                {connector.developer ? (
                  <div>
                    <p className="text-text-muted">Author</p>
                    <p className="text-text mt-0.5">{connector.developer}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-text-muted">Auth</p>
                  <p className="text-text mt-0.5">
                    {AUTH_LABEL[connector.authType] ?? connector.authType}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-text-muted">Connector URL</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="text-text truncate font-mono text-xs">{connector.connectorUrl}</p>
                    <button
                      type="button"
                      onClick={copyConnectorUrl}
                      aria-label="Copy connector URL"
                      className="text-text-faint hover:text-text shrink-0"
                    >
                      <IconCopy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 text-sm">
                {capabilities.length > 0 ? (
                  <div>
                    <p className="text-text-muted">Capabilities</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {capabilities.map((c) => (
                        <span
                          key={c}
                          className="bg-bg-subtle text-text-muted rounded-full px-2.5 py-1 text-xs font-medium"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {moreInfoLinks.length > 0 ? (
                  <div>
                    <p className="text-text-muted">More info</p>
                    <div className="mt-1.5 flex flex-col gap-1.5">
                      {moreInfoLinks.map((link) => (
                        <a
                          key={link.label}
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent inline-flex w-fit items-center gap-1 hover:underline"
                        >
                          {link.label}
                          <IconExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {connector.authType === "static_headers" && !connector.connected ? (
            <div className="border-border bg-bg-subtle mt-8 rounded-xl border p-5">
              <p className="text-text text-sm font-medium">Connect with custom headers</p>
              <div className="mt-3 flex flex-col gap-2">
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
                <div className="mt-1 flex gap-2">
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
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
