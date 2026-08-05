// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown } from "./markdown";

describe("Markdown", () => {
  it("renders bold text as a real <strong>, not literal asterisks", () => {
    render(<Markdown>{"This is **important**."}</Markdown>);
    const strong = screen.getByText("important");
    expect(strong.tagName).toBe("STRONG");
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
  });

  it("renders an ordered list as real <ol>/<li> elements", () => {
    render(<Markdown>{"1. First step\n2. Second step"}</Markdown>);
    expect(screen.getByText("First step").closest("li")).toBeInTheDocument();
    expect(screen.getByText("Second step").closest("ol")).toBeInTheDocument();
  });

  it("renders a link as a real anchor opening in a new tab", () => {
    render(<Markdown>{"See [the docs](https://example.com)."}</Markdown>);
    const link = screen.getByRole("link", { name: "the docs" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders inline code in a <code> element", () => {
    render(<Markdown>{"Run `npm test` first."}</Markdown>);
    expect(screen.getByText("npm test").tagName).toBe("CODE");
  });

  it("never injects raw HTML — a literal <script> tag renders as text, not a DOM node", () => {
    render(<Markdown>{"<script>alert(1)</script>"}</Markdown>);
    expect(document.querySelector("script")).not.toBeInTheDocument();
  });

  it("defaults to the sm size, and switches to xs via the size prop", () => {
    const { container, rerender } = render(<Markdown>{"Hello"}</Markdown>);
    expect(container.firstElementChild).toHaveClass("text-sm");

    rerender(<Markdown size="xs">{"Hello"}</Markdown>);
    expect(container.firstElementChild).toHaveClass("text-xs");
    expect(container.firstElementChild).not.toHaveClass("text-sm");
  });
});
