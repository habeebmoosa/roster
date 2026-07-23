// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentOption, ConversationSummary } from "../types";
import { Chat } from "./chat";

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
    render(<Chat agents={AGENTS} configured={["google"]} conversations={[]} />);
    expect(screen.getByText("Ask Ada — Customer Support anything")).toBeInTheDocument();
  });

  it("switching employee via the switcher resets the thread", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse("Hi!")));
    render(<Chat agents={AGENTS} configured={["google"]} conversations={[]} />);

    await user.type(screen.getByPlaceholderText("Message the employee…"), "Hello");
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
    render(<Chat agents={AGENTS} configured={["google"]} conversations={[]} />);

    await user.type(screen.getByPlaceholderText("Message the employee…"), "Hello");
    await user.click(screen.getByTestId("send"));
    expect(await screen.findByText("Hello")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "New chat" }));
    expect(screen.getByText("Ask Ada — Customer Support anything")).toBeInTheDocument();
  });

  it("selecting a conversation from History switches to that employee and closes the drawer", async () => {
    const user = userEvent.setup();
    render(<Chat agents={AGENTS} configured={["google"]} conversations={CONVERSATIONS} />);

    await user.click(screen.getByRole("button", { name: "History" }));
    await user.click(screen.getByText("Blog post draft"));

    expect(screen.getByText("Ask Milo — Content Writer anything")).toBeInTheDocument();
    // Drawer stays mounted (for its CSS transition) — check it's hidden, not gone.
    const drawerWrapper = screen.getByRole("dialog", { hidden: true }).parentElement!;
    expect(drawerWrapper).toHaveAttribute("aria-hidden", "true");
  });
});
