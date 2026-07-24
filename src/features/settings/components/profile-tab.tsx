"use client";

import { useState } from "react";
import { Avatar, Button, Card, CardDescription, CardTitle, Input, Modal } from "@/ui";

export function ProfileTab({ name, email }: { name: string; email: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>Profile</CardTitle>
        <div className="mt-4 flex items-center gap-4">
          <Avatar name={name} size="lg" />
          <Button variant="secondary" disabled title="Coming soon">
            Change avatar
          </Button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="text-text font-medium">Full name</span>
            <Input value={name} readOnly disabled />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-text font-medium">Email</span>
            <Input value={email} readOnly disabled />
          </label>
        </div>
        <p className="text-text-faint mt-2 text-xs">
          Your name and email are managed by your Google account.
        </p>
      </Card>

      <Card>
        <CardTitle>Two-factor authentication</CardTitle>
        <CardDescription>Add an extra layer of security to your account.</CardDescription>
        <div className="mt-3 flex items-center gap-3">
          <Button variant="secondary" disabled title="You sign in with Google">
            Two-factor authentication
          </Button>
          <Button variant="secondary" disabled title="You sign in with Google">
            Change password
          </Button>
        </div>
        <p className="text-text-faint mt-2 text-xs">
          You sign in with Google, so there&apos;s no separate Roster password — manage 2FA from
          your Google account.
        </p>
      </Card>

      <Card>
        <CardTitle>Delete account</CardTitle>
        <CardDescription>This immediately removes your access to this workspace.</CardDescription>
        <Button variant="danger" className="mt-3" onClick={() => setConfirmOpen(true)}>
          Delete account
        </Button>
      </Card>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Delete account?">
        <p className="text-text-muted text-sm">
          This isn&apos;t wired up yet — nothing will actually be deleted.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" disabled title="Coming soon">
            Delete account
          </Button>
        </div>
      </Modal>
    </div>
  );
}
