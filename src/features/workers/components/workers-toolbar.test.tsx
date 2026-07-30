// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkersToolbar } from "./workers-toolbar";

describe("WorkersToolbar", () => {
  it("submits via GET to /workers so filtering needs no client JS", () => {
    render(<WorkersToolbar query="" />);
    const form = document.querySelector("form")!;
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/workers");
  });

  it("pre-fills the search input from the current query", () => {
    render(<WorkersToolbar query="support" />);
    expect(screen.getByRole("searchbox", { name: "Filter workers" })).toHaveValue("support");
  });
});
