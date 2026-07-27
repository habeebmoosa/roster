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

  it("renders step events above the assistant's reply", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "What's my order status?" },
      {
        role: "assistant",
        content: "It's on the way.",
        stepEvents: [
          { type: "step-start", index: 1, goal: "Look up the order" },
          { type: "step-complete", index: 1, passed: true, attempts: 1 },
        ],
      },
    ];
    render(<ChatThread messages={messages} employee={ADA} running={false} />);
    expect(screen.getByTestId("step-events-list")).toBeInTheDocument();
    expect(screen.getByText("Look up the order")).toBeInTheDocument();
    expect(screen.getByText("It's on the way.")).toBeInTheDocument();
  });

  it("does not render a step list for a message with no step events", () => {
    const messages: ChatMessage[] = [{ role: "assistant", content: "Just a plain reply." }];
    render(<ChatThread messages={messages} employee={ADA} running={false} />);
    expect(screen.queryByTestId("step-events-list")).not.toBeInTheDocument();
  });

  it("renders a structured error banner instead of splicing text into the reply", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "", error: "The API key was rejected." },
    ];
    render(<ChatThread messages={messages} employee={ADA} running={false} />);
    expect(screen.getByRole("alert")).toHaveTextContent("The API key was rejected.");
  });

  it("renders both partial content and an error when the turn failed mid-stream", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "Hi" },
      {
        role: "assistant",
        content: "Let me check tha",
        error: "The provider is rate-limiting requests.",
      },
    ];
    render(<ChatThread messages={messages} employee={ADA} running={false} />);
    expect(screen.getByText("Let me check tha")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("The provider is rate-limiting requests.");
  });
});
