// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AgentOption, ChatMessage } from "../types";
import { ChatThread } from "./chat-thread";

const ADA: AgentOption = {
  id: "customer-support",
  name: "Ada — Customer Support",
  role: "Support",
};

describe("ChatThread", () => {
  it("shows an empty-state prompt naming the employee when there are no messages", () => {
    render(<ChatThread messages={[]} employee={ADA} running={false} />);
    expect(screen.getByText("Ask Ada — Customer Support anything")).toBeInTheDocument();
    expect(screen.getByText("Support")).toBeInTheDocument();
  });

  it("renders user and assistant messages", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "I want a refund" },
      { role: "assistant", content: "I can help with that." },
    ];
    render(<ChatThread messages={messages} employee={ADA} running={false} />);
    expect(screen.getByText("I want a refund")).toBeInTheDocument();
    expect(screen.getByText("I can help with that.")).toBeInTheDocument();
  });

  it("shows a streaming placeholder for the last empty assistant message while running", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "" },
    ];
    render(<ChatThread messages={messages} employee={ADA} running={true} />);
    expect(screen.getByText("…")).toBeInTheDocument();
  });
});
