// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("gets the default bordered/focus-ring styling", () => {
    render(<Textarea placeholder="default" />);
    const el = screen.getByPlaceholderText("default");
    expect(el.className).toContain("border");
    expect(el.className).toContain("focus:ring-2");
  });

  it("unstyled drops the border/shadow/ring entirely rather than trying to cancel it via className", () => {
    // Regression: `className="border-none focus:ring-0"` doesn't reliably
    // beat the default `border focus:ring-2` in Tailwind v4 — a real variant
    // is the only reliable way to opt out (see the chat composer, which was
    // showing a stray focus ring/border it couldn't override this way).
    render(<Textarea unstyled placeholder="bare" />);
    const el = screen.getByPlaceholderText("bare");
    expect(el.className).not.toContain("focus:ring-2");
    expect(el.className).not.toContain("shadow-sm");
    expect(el.className).not.toContain("rounded-md");
  });

  it("still merges an explicit className on top of either variant", () => {
    render(<Textarea unstyled className="min-h-16" placeholder="bare-with-extra" />);
    expect(screen.getByPlaceholderText("bare-with-extra").className).toContain("min-h-16");
  });
});
