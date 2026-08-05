// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TypingIndicator } from "./typing-indicator";

describe("TypingIndicator", () => {
  it("announces a thinking status for screen readers", () => {
    render(<TypingIndicator />);
    expect(screen.getByRole("status")).toHaveTextContent("Thinking…");
  });
});
