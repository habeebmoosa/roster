// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { MessagePart } from "@/core/agent";
import { ReasoningBlock } from "./reasoning-block";

type ReasoningPart = Extract<MessagePart, { type: "reasoning" }>;

function part(overrides: Partial<ReasoningPart> = {}): ReasoningPart {
  return { type: "reasoning", text: "", done: false, startedAt: 0, ...overrides };
}

describe("ReasoningBlock", () => {
  it("expands automatically and shows a pulsing 'Thinking' label while still in progress", () => {
    render(<ReasoningBlock part={part({ text: "Working it out...", done: false })} />);
    expect(screen.getByText("Thinking")).toBeInTheDocument();
    expect(screen.getByText("Working it out...")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });

  it("collapses automatically to a 'Thought for Ns' summary once done", () => {
    render(<ReasoningBlock part={part({ text: "Done thinking.", done: true, startedAt: 0, endedAt: 3000 })} />);
    expect(screen.getByText("Thought for 3s")).toBeInTheDocument();
    expect(screen.queryByText("Done thinking.")).not.toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
  });

  it("expands again on click after auto-collapsing", async () => {
    const user = userEvent.setup();
    render(<ReasoningBlock part={part({ text: "Done thinking.", done: true, startedAt: 0, endedAt: 3000 })} />);

    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Done thinking.")).toBeInTheDocument();
  });

  it("lets the user manually collapse it while still in progress", async () => {
    const user = userEvent.setup();
    render(<ReasoningBlock part={part({ text: "Working it out...", done: false })} />);

    await user.click(screen.getByRole("button"));
    expect(screen.queryByText("Working it out...")).not.toBeInTheDocument();
  });
});
