// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { MessagePart } from "@/core/agent";
import { ToolCallChip } from "./tool-call-chip";

type ToolCallPart = Extract<MessagePart, { type: "tool-call" }>;

function part(overrides: Partial<ToolCallPart> = {}): ToolCallPart {
  return {
    type: "tool-call",
    toolCallId: "call_1",
    toolName: "calculate",
    source: "builtin",
    input: undefined,
    state: "input-streaming",
    ...overrides,
  };
}

describe("ToolCallChip", () => {
  it("shows the tool name but no connector attribution for a built-in tool", () => {
    render(<ToolCallChip part={part()} />);
    expect(screen.getByText("calculate")).toBeInTheDocument();
    expect(screen.queryByText(/^via /)).not.toBeInTheDocument();
  });

  it("attributes an MCP tool call to its connector", () => {
    render(
      <ToolCallChip
        part={part({ toolName: "mcp_linear_search", source: "mcp", connectorName: "Linear" })}
      />,
    );
    expect(screen.getByText("mcp_linear_search")).toBeInTheDocument();
    expect(screen.getByText("via Linear")).toBeInTheDocument();
  });

  it("is collapsed by default, expanding on click to show input and output", async () => {
    const user = userEvent.setup();
    render(
      <ToolCallChip
        part={part({
          input: { query: "ticket 123" },
          output: { status: "resolved" },
          state: "output-available",
        })}
      />,
    );

    expect(screen.queryByText("Input")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button"));

    expect(screen.getByText("Input")).toBeInTheDocument();
    expect(screen.getByText(/"query": "ticket 123"/)).toBeInTheDocument();
    expect(screen.getByText("Output")).toBeInTheDocument();
    expect(screen.getByText(/"status": "resolved"/)).toBeInTheDocument();
  });

  it("shows the error message instead of an output section when the call failed", async () => {
    const user = userEvent.setup();
    render(
      <ToolCallChip
        part={part({ state: "output-error", errorText: "Connector unreachable" })}
      />,
    );

    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Connector unreachable")).toBeInTheDocument();
    expect(screen.queryByText("Output")).not.toBeInTheDocument();
  });
});
