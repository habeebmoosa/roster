// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderKeyRecord } from "@/server/db/repositories/provider-key.repository";
import { DetailModelTab } from "./detail-model-tab";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const toast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ toast: (...args: unknown[]) => toast(...args) }));

// This tab's own fetch assertions are about the PATCH call — stub the model
// picker's background fetch so it doesn't pollute those (same pattern as
// credential-form.test.tsx).
vi.mock("@/hooks/use-model-options", () => ({
  useModelOptions: () => ({ options: [], loading: false }),
}));

function providerKey(provider: string): ProviderKeyRecord {
  return {
    id: `key-${provider}`,
    provider,
    label: "Default",
    isDefault: true,
    baseUrl: null,
    config: {},
    createdAt: new Date("2026-01-01"),
  };
}

beforeEach(() => {
  refresh.mockClear();
  toast.mockClear();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetchOnce(status: number, body: unknown) {
  (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: status < 400,
    status,
    json: async () => body,
  });
}

describe("DetailModelTab — read-only view", () => {
  it("renders the display provider, tier, and model, with a Change model action", () => {
    render(
      <DetailModelTab
        agentId="customer-support"
        displayProvider="Google"
        displayTier="Free tier"
        displayModel="gemini-2.0-flash"
        currentModel={null}
        providerKeys={[providerKey("google")]}
      />,
    );
    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.getByText("Free tier")).toBeInTheDocument();
    expect(screen.getByText("gemini-2.0-flash")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change model" })).toBeInTheDocument();
  });

  it("prompts to connect a provider instead, when none are connected", () => {
    render(
      <DetailModelTab
        agentId="customer-support"
        displayProvider="OpenAI"
        displayTier="Pay-as-you-go"
        displayModel="gpt-4o-mini"
        currentModel={null}
        providerKeys={[]}
      />,
    );
    expect(screen.queryByRole("button", { name: "Change model" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Connect a provider/ })).toHaveAttribute(
      "href",
      "/settings?tab=providers",
    );
  });
});

describe("DetailModelTab — editing", () => {
  it("opens the editor pre-filled with the current model, and PATCHes provider+model on save", async () => {
    mockFetchOnce(200, { ok: true, model: { provider: "anthropic", model: "claude-sonnet-5" } });
    const user = userEvent.setup();
    render(
      <DetailModelTab
        agentId="customer-support"
        displayProvider="Anthropic"
        displayTier="Connected"
        displayModel="claude-haiku-4-5"
        currentModel={{ provider: "anthropic", model: "claude-haiku-4-5" }}
        providerKeys={[providerKey("openai"), providerKey("anthropic")]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Change model" }));
    expect(screen.getByLabelText("Provider")).toHaveValue("anthropic");
    // Anthropic's suggested list doesn't contain the exact stored id
    // ("claude-haiku-4-5" vs. the catalog's "claude-haiku-4-5-20251001") — it's
    // added as its own option so the current value is never silently lost.
    expect(screen.getByLabelText("Model")).toHaveValue("claude-haiku-4-5");

    // Model renders as a real dropdown (Anthropic has a known suggested list) —
    // pick one of its listed options rather than typing free text.
    await user.selectOptions(screen.getByLabelText("Model"), "claude-sonnet-5");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith(
      "/api/agents/customer-support/model",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ provider: "anthropic", model: "claude-sonnet-5" }),
      }),
    );
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "success" }));
  });

  it("switching provider resets the model to that provider's first suggested model", async () => {
    const user = userEvent.setup();
    render(
      <DetailModelTab
        agentId="customer-support"
        displayProvider="OpenAI"
        displayTier="Connected"
        displayModel="gpt-4o-mini"
        currentModel={{ provider: "openai", model: "gpt-4o-mini" }}
        providerKeys={[providerKey("openai"), providerKey("anthropic")]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Change model" }));
    await user.selectOptions(screen.getByLabelText("Provider"), "anthropic");

    expect(screen.getByLabelText("Model")).not.toHaveValue("gpt-4o-mini");
  });

  it("cancel discards edits and returns to the read-only view without calling the API", async () => {
    const user = userEvent.setup();
    render(
      <DetailModelTab
        agentId="customer-support"
        displayProvider="OpenAI"
        displayTier="Connected"
        displayModel="gpt-4o-mini"
        currentModel={{ provider: "openai", model: "gpt-4o-mini" }}
        providerKeys={[providerKey("openai")]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Change model" }));
    await user.selectOptions(screen.getByLabelText("Model"), "o4-mini");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("button", { name: "Change model" })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows the server's error message and stays in the editor on a rejected save", async () => {
    mockFetchOnce(400, {
      error: { message: "Connect this provider in Settings before assigning it here." },
    });
    const user = userEvent.setup();
    render(
      <DetailModelTab
        agentId="customer-support"
        displayProvider="OpenAI"
        displayTier="Connected"
        displayModel="gpt-4o-mini"
        currentModel={{ provider: "openai", model: "gpt-4o-mini" }}
        providerKeys={[providerKey("openai")]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Change model" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Connect this provider in Settings before assigning it here."),
    ).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
