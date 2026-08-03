// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderKeyRecord } from "@/server/db/repositories/provider-key.repository";
import { ChatComposer } from "./chat-composer";

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
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderComposer(overrides: Partial<React.ComponentProps<typeof ChatComposer>> = {}) {
  const onSend = vi.fn();
  const onModelSelect = vi.fn();
  render(
    <ChatComposer
      provider="google"
      model="gemini-2.5-flash-lite"
      providerKeys={[providerKey("google")]}
      onModelSelect={onModelSelect}
      onSend={onSend}
      running={false}
      error=""
      {...overrides}
    />,
  );
  return { onSend, onModelSelect };
}

describe("ChatComposer", () => {
  it("sends the trimmed message and clears the input on submit", async () => {
    const user = userEvent.setup();
    const { onSend } = renderComposer();

    const textarea = screen.getByPlaceholderText("Describe a task or ask a question");
    await user.type(textarea, "  Hello there  ");
    await user.click(screen.getByTestId("send"));

    expect(onSend).toHaveBeenCalledWith("  Hello there  ");
    expect(textarea).toHaveValue("");
  });

  it("submits on Enter and inserts a newline on Shift+Enter", async () => {
    const user = userEvent.setup();
    const { onSend } = renderComposer();

    const textarea = screen.getByPlaceholderText("Describe a task or ask a question");
    await user.type(textarea, "line one{Shift>}{Enter}{/Shift}line two");
    expect(onSend).not.toHaveBeenCalled();
    expect(textarea).toHaveValue("line one\nline two");

    await user.type(textarea, "{Enter}");
    expect(onSend).toHaveBeenCalledWith("line one\nline two");
  });

  it("does not submit an empty message", async () => {
    const user = userEvent.setup();
    const { onSend } = renderComposer();
    await user.click(screen.getByTestId("send"));
    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables the send button while running", () => {
    renderComposer({ running: true });
    expect(screen.getByTestId("send")).toBeDisabled();
    expect(screen.getByTestId("send")).toHaveAttribute("aria-label", "Streaming");
  });

  it("shows the error message when present", () => {
    renderComposer({ error: "Invalid key" });
    expect(screen.getByText("Invalid key")).toBeInTheDocument();
  });

  it("shows the '+' tools menu with disabled (not-yet-wired) items", async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole("button", { name: "Add attachments or tools" }));
    expect(screen.getByRole("menuitem", { name: "Add files" })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: "Web search" })).toBeDisabled();
  });

  it("groups the model picker by connected provider, one label per provider, only for configured providers", async () => {
    const user = userEvent.setup();
    renderComposer({
      providerKeys: [providerKey("google"), providerKey("anthropic")],
    });

    await user.click(screen.getByRole("button", { name: "Select model" }));
    expect(screen.getByText("Google Gemini")).toBeInTheDocument();
    expect(screen.getByText("Anthropic")).toBeInTheDocument();
    // A provider never connected shouldn't appear at all.
    expect(screen.queryByText("OpenAI")).not.toBeInTheDocument();
  });

  it("selecting a model in the picker calls onModelSelect with its provider and model id", async () => {
    const user = userEvent.setup();
    const { onModelSelect } = renderComposer({
      providerKeys: [providerKey("anthropic")],
    });

    await user.click(screen.getByRole("button", { name: "Select model" }));
    await user.click(screen.getByRole("menuitem", { name: "claude-sonnet-5" }));

    expect(onModelSelect).toHaveBeenCalledWith("anthropic", "claude-sonnet-5");
  });
});
