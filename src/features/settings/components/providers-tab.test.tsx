// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProviderKeyRecord } from "@/server/db/repositories/provider-key.repository";
import { ProvidersTab } from "./providers-tab";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

const OPENAI_KEY: ProviderKeyRecord = {
  id: "key-1",
  provider: "openai",
  label: null,
  baseUrl: null,
  config: {},
  createdAt: new Date("2026-01-01"),
};

describe("ProvidersTab", () => {
  it("shows an empty state when there are no configured providers", () => {
    render(<ProvidersTab keys={[]} />);
    expect(screen.getByText("No providers yet. Add one below to get started.")).toBeInTheDocument();
  });

  it("lists a configured provider with a Remove action", () => {
    render(<ProvidersTab keys={[OPENAI_KEY]} />);
    // "OpenAI" also appears as a <select> option in the add-provider form below.
    expect(screen.getAllByText("OpenAI").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("always renders the add-provider form", () => {
    render(<ProvidersTab keys={[]} />);
    expect(screen.getByText("Add a provider")).toBeInTheDocument();
  });
});
