// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ApiKeySummary } from "@/server/db/repositories/api-key.repository";
import { ApiKeysTab } from "./api-keys-tab";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function key(overrides: Partial<ApiKeySummary> = {}): ApiKeySummary {
  return {
    id: "key-1",
    label: "Production",
    keyPrefix: "rk_live_4f2a9c",
    createdAt: new Date("2026-06-01T12:00:00"),
    lastUsedAt: null,
    revokedAt: null,
    ...overrides,
  };
}

describe("ApiKeysTab", () => {
  it("shows an empty state with no keys", () => {
    render(<ApiKeysTab keys={[]} />);
    expect(screen.getByText("No API keys yet")).toBeInTheDocument();
  });

  it("lists a key with its masked prefix, created date, and 'Never' when unused", () => {
    render(<ApiKeysTab keys={[key()]} />);
    expect(screen.getByText("Production")).toBeInTheDocument();
    expect(screen.getByText("rk_live_4f2a9c••••••••")).toBeInTheDocument();
    expect(screen.getByText(/Created Jun 1, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Last used Never/)).toBeInTheDocument();
  });

  it("shows the last-used date when the key has been used", () => {
    render(<ApiKeysTab keys={[key({ lastUsedAt: new Date("2026-06-05T12:00:00") })]} />);
    expect(screen.getByText(/Last used Jun 5, 2026/)).toBeInTheDocument();
  });

  it("shows a Revoke button for an active key", () => {
    render(<ApiKeysTab keys={[key()]} />);
    expect(screen.getByRole("button", { name: "Revoke" })).toBeInTheDocument();
  });

  it("shows a Revoked badge instead of a Revoke button for a revoked key", () => {
    render(<ApiKeysTab keys={[key({ revokedAt: new Date("2026-06-10T12:00:00") })]} />);
    expect(screen.queryByRole("button", { name: "Revoke" })).not.toBeInTheDocument();
    expect(screen.getByText(/Revoked Jun 10, 2026/)).toBeInTheDocument();
  });

  it("lists multiple keys", () => {
    render(
      <ApiKeysTab
        keys={[key({ id: "key-1", label: "Production" }), key({ id: "key-2", label: "Staging" })]}
      />,
    );
    expect(screen.getByText("Production")).toBeInTheDocument();
    expect(screen.getByText("Staging")).toBeInTheDocument();
  });
});
