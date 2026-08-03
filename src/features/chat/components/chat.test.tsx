// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProviderKeyRecord } from "@/server/db/repositories/provider-key.repository";
import type { AgentOption, ConversationSummary } from "../types";
import { Chat } from "./chat";

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ toast: (...args: unknown[]) => toastMock(...args) }));

// This tab's own fetch assertions are about /api/chat and /api/conversations —
// stub the model picker's background fetch so it doesn't pollute those.
vi.mock("@/hooks/use-model-options", () => ({
  useModelOptions: () => ({ options: [], loading: false }),
}));

const PROVIDER_KEYS: ProviderKeyRecord[] = [
  {
    id: "key-google",
    provider: "google",
    label: "Default",
    isDefault: true,
    baseUrl: null,
    config: {},
    createdAt: new Date("2026-01-01"),
  },
];

const AGENTS: AgentOption[] = [
  { id: "customer-support", name: "Ada — Customer Support", role: "Support Specialist" },
  { id: "content-writer", name: "Milo — Content Writer", role: "Content Writer" },
];

const CONVERSATIONS: ConversationSummary[] = [
  {
    id: "content-writer-0",
    employeeId: "content-writer",
    employeeName: "Milo — Content Writer",
    title: "Blog post draft",
    date: "Today",
  },
];

function streamResponse(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

describe("Chat", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the empty-state prompt for the first employee by default", () => {
    render(<Chat agents={AGENTS} providerKeys={PROVIDER_KEYS} conversations={[]} />);
    expect(screen.getByText("Ask Ada — Customer Support anything")).toBeInTheDocument();
  });

  it("pre-selects initialAgentId, e.g. arriving from the hire wizard via ?agentId=", () => {
    render(
      <Chat
        agents={AGENTS}
        providerKeys={PROVIDER_KEYS}
        conversations={[]}
        initialAgentId="content-writer"
      />,
    );
    expect(screen.getByText("Ask Milo — Content Writer anything")).toBeInTheDocument();
  });

  it("falls back to the first employee when initialAgentId doesn't match any agent", () => {
    render(
      <Chat
        agents={AGENTS}
        providerKeys={PROVIDER_KEYS}
        conversations={[]}
        initialAgentId="does-not-exist"
      />,
    );
    expect(screen.getByText("Ask Ada — Customer Support anything")).toBeInTheDocument();
  });

  it("switching employee via the switcher resets the thread", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse("Hi!")));
    render(<Chat agents={AGENTS} providerKeys={PROVIDER_KEYS} conversations={[]} />);

    await user.type(screen.getByPlaceholderText("Describe a task or ask a question"), "Hello");
    await user.click(screen.getByTestId("send"));
    expect(await screen.findByText("Hello")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Ada — Customer Support/ }));
    await user.click(screen.getByRole("menuitem", { name: /Milo — Content Writer/ }));

    expect(screen.getByText("Ask Milo — Content Writer anything")).toBeInTheDocument();
    expect(screen.queryByText("Hello")).not.toBeInTheDocument();
  });

  it("New chat clears the thread", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse("Hi!")));
    render(<Chat agents={AGENTS} providerKeys={PROVIDER_KEYS} conversations={[]} />);

    await user.type(screen.getByPlaceholderText("Describe a task or ask a question"), "Hello");
    await user.click(screen.getByTestId("send"));
    expect(await screen.findByText("Hello")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "New chat" }));
    expect(screen.getByText("Ask Ada — Customer Support anything")).toBeInTheDocument();
  });

  it("selecting a conversation from History fetches it, switches employee, loads its messages (steps included), and closes the drawer", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            conversation: {
              id: "content-writer-0",
              agentId: "content-writer",
              title: "Blog post draft",
              messages: [
                { role: "user", content: "Draft a blog post about onboarding" },
                {
                  role: "assistant",
                  content: "Here's a draft outline…",
                  stepEvents: [
                    { type: "step-start", index: 1, goal: "Look up the style guide" },
                    { type: "step-complete", index: 1, passed: true, attempts: 1 },
                  ],
                },
              ],
            },
          }),
          { status: 200 },
        ),
      ),
    );
    render(<Chat agents={AGENTS} providerKeys={PROVIDER_KEYS} conversations={CONVERSATIONS} />);

    await user.click(screen.getByRole("button", { name: "History" }));
    await user.click(screen.getByText("Blog post draft"));

    expect(await screen.findByText("Draft a blog post about onboarding")).toBeInTheDocument();
    expect(screen.getByText("Here's a draft outline…")).toBeInTheDocument();
    // A reloaded conversation reproduces its step events, not just its text.
    expect(screen.getByTestId("step-events-list")).toBeInTheDocument();
    expect(screen.getByText("Look up the style guide")).toBeInTheDocument();
    // Employee switched to match the loaded conversation.
    expect(screen.getByRole("button", { name: /Milo — Content Writer/ })).toBeInTheDocument();
    // Drawer stays mounted (for its CSS transition) — check it's hidden, not gone.
    const drawerWrapper = screen.getByRole("dialog", { hidden: true }).parentElement!;
    expect(drawerWrapper).toHaveAttribute("aria-hidden", "true");
  });

  it("shows an error toast when the selected conversation can't be loaded", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: { message: "Not found" } }), { status: 404 }),
        ),
    );
    render(<Chat agents={AGENTS} providerKeys={PROVIDER_KEYS} conversations={CONVERSATIONS} />);

    await user.click(screen.getByRole("button", { name: "History" }));
    await user.click(screen.getByText("Blog post draft"));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Couldn't open that conversation" }),
      );
    });
    // Stays on the originally-selected employee — nothing loaded.
    expect(screen.getByText("Ask Ada — Customer Support anything")).toBeInTheDocument();
  });
});
