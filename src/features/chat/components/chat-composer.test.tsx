// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatComposer } from "./chat-composer";

function renderComposer(overrides: Partial<React.ComponentProps<typeof ChatComposer>> = {}) {
  const onSend = vi.fn();
  render(
    <ChatComposer
      provider="google"
      model="gemini-2.0-flash"
      configured={["google"]}
      onProviderChange={() => {}}
      onModelChange={() => {}}
      onSend={onSend}
      running={false}
      error=""
      {...overrides}
    />,
  );
  return { onSend };
}

describe("ChatComposer", () => {
  it("sends the trimmed message and clears the input on submit", async () => {
    const user = userEvent.setup();
    const { onSend } = renderComposer();

    const textarea = screen.getByPlaceholderText("Message the employee…");
    await user.type(textarea, "  Hello there  ");
    await user.click(screen.getByTestId("send"));

    expect(onSend).toHaveBeenCalledWith("  Hello there  ");
    expect(textarea).toHaveValue("");
  });

  it("submits on Enter and inserts a newline on Shift+Enter", async () => {
    const user = userEvent.setup();
    const { onSend } = renderComposer();

    const textarea = screen.getByPlaceholderText("Message the employee…");
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
    expect(screen.getByText("Streaming…")).toBeInTheDocument();
  });

  it("shows the error message when present", () => {
    renderComposer({ error: "Invalid key" });
    expect(screen.getByText("Invalid key")).toBeInTheDocument();
  });
});
