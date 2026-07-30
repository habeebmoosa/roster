"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "@/hooks/use-toast";
import { Button, Input, Modal, Select, Textarea } from "@/ui";

export function AddCustomConnectorDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [connectorUrl, setConnectorUrl] = useState("");
  const [authType, setAuthType] = useState<"oauth_dcr" | "static_headers" | "none">(
    "static_headers",
  );
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/mcp/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, connectorUrl, authType }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: "Couldn't add server",
          description: data?.error?.message,
          variant: "danger",
        });
        return;
      }
      toast({ title: `Added ${name}`, variant: "success" });
      router.refresh();
      onClose();
    } catch {
      toast({ title: "Network error. Try again.", variant: "danger" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Add a custom MCP server">
      <form onSubmit={onSubmit} className="grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-text font-medium">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-text font-medium">Description</span>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-text font-medium">Connector URL</span>
          <Input
            type="url"
            value={connectorUrl}
            onChange={(e) => setConnectorUrl(e.target.value)}
            placeholder="https://mcp.example.com/mcp"
            required
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-text font-medium">Authentication</span>
          <Select value={authType} onChange={(e) => setAuthType(e.target.value as typeof authType)}>
            <option value="static_headers">Custom headers (API key, bearer token, …)</option>
            <option value="oauth_dcr">OAuth 2.1</option>
            <option value="none">None</option>
          </Select>
        </label>

        <div className="mt-2 flex gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Adding…" : "Add server"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
