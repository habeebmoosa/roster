"use client";

import { useState } from "react";
import { ThemeToggle } from "@/ui/theme";
import { Button, Card, CardDescription, CardTitle, Input, Modal, Select } from "@/ui";
import { TIMEZONES } from "../fixtures";

export function WorkspaceTab({ initialName }: { initialName: string }) {
  // Local-only — there's no multi-tenant workspace model yet (out of MVP
  // scope). Nothing here persists on reload.
  const [name, setName] = useState(initialName);
  const [url, setUrl] = useState(initialName.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  const [timezone, setTimezone] = useState(TIMEZONES[1]!);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>Workspace</CardTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-text font-medium">Workspace name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-text font-medium">Workspace URL</span>
            <div className="border-border bg-bg-elevated focus-within:border-accent focus-within:ring-accent/30 flex items-center rounded-md border text-sm shadow-sm focus-within:ring-2">
              <span className="text-text-faint pl-3">rosterai.com/</span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="text-text w-full bg-transparent py-2 pr-3 pl-1 outline-none"
              />
            </div>
          </label>
        </div>
        <label className="mt-4 grid gap-1 text-sm">
          <span className="text-text font-medium">Timezone</span>
          <Select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="max-w-xs"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </label>
      </Card>

      <Card>
        <CardTitle>Appearance</CardTitle>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-text-muted text-sm">Switch between light and dark mode.</p>
          <ThemeToggle />
        </div>
      </Card>

      <Card>
        <CardTitle>Delete workspace</CardTitle>
        <CardDescription>
          Permanently delete this workspace and every employee, conversation, and key in it.
        </CardDescription>
        <Button variant="danger" className="mt-3" onClick={() => setConfirmOpen(true)}>
          Delete workspace
        </Button>
      </Card>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Delete workspace?">
        <p className="text-text-muted text-sm">
          This isn&apos;t wired up yet — nothing will actually be deleted.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" disabled title="Coming soon">
            Delete workspace
          </Button>
        </div>
      </Modal>
    </div>
  );
}
