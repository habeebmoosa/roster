// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProvider } from "@/core/providers/catalog";
import type { ProviderKeyRecord } from "@/server/db/repositories/provider-key.repository";
import { ManageCredentialsDialog } from "./manage-credentials-dialog";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ toast: (...args: unknown[]) => toast(...args) }));

const OPENAI = getProvider("openai")!;

const PERSONAL: ProviderKeyRecord = {
  id: "cred-1",
  provider: "openai",
  label: "Personal",
  isDefault: true,
  baseUrl: null,
  config: {},
  createdAt: new Date("2026-01-01"),
};
const WORK: ProviderKeyRecord = {
  id: "cred-2",
  provider: "openai",
  label: "Work",
  isDefault: false,
  baseUrl: "https://work-proxy.example.com/v1",
  config: {},
  createdAt: new Date("2026-01-02"),
};

beforeEach(() => {
  refresh.mockClear();
  toast.mockClear();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ManageCredentialsDialog", () => {
  it("lists every credential with its default badge and a set-default action on the others", () => {
    render(
      <ManageCredentialsDialog provider={OPENAI} credentials={[PERSONAL, WORK]} onClose={vi.fn()} />,
    );

    expect(screen.getByText("Personal")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(screen.getByText("https://work-proxy.example.com/v1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set as default" })).toBeInTheDocument();
  });

  it("sets a credential as default via POST .../default", async () => {
    const user = userEvent.setup();
    render(
      <ManageCredentialsDialog provider={OPENAI} credentials={[PERSONAL, WORK]} onClose={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "Set as default" }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/api/providers/openai/credentials/cred-2/default", {
        method: "POST",
      }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("removes a credential via DELETE and stays open when others remain", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <ManageCredentialsDialog
        provider={OPENAI}
        credentials={[PERSONAL, WORK]}
        onClose={onClose}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "Remove" })[0]!);

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/api/providers/openai/credentials/cred-1", {
        method: "DELETE",
      }),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes the dialog after removing the last remaining credential", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ManageCredentialsDialog provider={OPENAI} credentials={[PERSONAL]} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("removes the whole provider via the footer action", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <ManageCredentialsDialog provider={OPENAI} credentials={[PERSONAL, WORK]} onClose={onClose} />,
    );

    await user.click(screen.getByRole("button", { name: "Remove provider entirely" }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/api/providers/openai", { method: "DELETE" }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("opens the credential form when Edit is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ManageCredentialsDialog provider={OPENAI} credentials={[PERSONAL, WORK]} onClose={vi.fn()} />,
    );

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]!);

    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("opens the add-another credential form from the footer", async () => {
    const user = userEvent.setup();
    render(
      <ManageCredentialsDialog provider={OPENAI} credentials={[PERSONAL, WORK]} onClose={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "+ Add another credential" }));

    expect(screen.getByRole("button", { name: "Validate & add" })).toBeInTheDocument();
    expect(screen.getByText("Make this the default")).toBeInTheDocument();
  });
});
