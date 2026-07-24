// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("defaults to the primary variant", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" }).className).toContain("bg-accent");
  });

  it("danger variant does not carry the secondary variant's text color", () => {
    render(<Button variant="danger">Delete</Button>);
    const el = screen.getByRole("button", { name: "Delete" });
    expect(el.className).toContain("text-danger");
    expect(el.className).not.toContain("text-text ");
  });

  it("is disabled when disabled is passed", () => {
    render(<Button disabled>Delete</Button>);
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });
});
