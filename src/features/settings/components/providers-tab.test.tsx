// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ProviderKeyRecord } from "@/server/db/repositories/provider-key.repository";
import { ProvidersTab } from "./providers-tab";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

const OPENAI_KEY: ProviderKeyRecord = {
  id: "key-1",
  provider: "openai",
  label: "Default",
  isDefault: true,
  baseUrl: null,
  config: {},
  createdAt: new Date("2026-01-01"),
};

describe("ProvidersTab", () => {
  it("shows an empty state when there are no configured providers", () => {
    render(<ProvidersTab credentialsByProvider={{}} />);
    expect(screen.getByText("No providers yet. Add one to get started.")).toBeInTheDocument();
  });

  it("lists a configured provider as a card with its credential count and default label", () => {
    render(<ProvidersTab credentialsByProvider={{ openai: [OPENAI_KEY] }} />);
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("1 credential · default: Default")).toBeInTheDocument();
  });

  it("opens the manage-credentials dialog when a configured provider card is clicked", async () => {
    const user = userEvent.setup();
    render(<ProvidersTab credentialsByProvider={{ openai: [OPENAI_KEY] }} />);

    await user.click(screen.getByRole("button", { name: /OpenAI/ }));
    expect(screen.getByText("Remove provider entirely")).toBeInTheDocument();
  });

  it("opens the add-provider dialog from the + Add provider button", async () => {
    const user = userEvent.setup();
    render(<ProvidersTab credentialsByProvider={{}} />);

    await user.click(screen.getByRole("button", { name: "+ Add provider" }));
    expect(screen.getByText("Bring your own key for any of these", { exact: false })).toBeInTheDocument();
  });
});
