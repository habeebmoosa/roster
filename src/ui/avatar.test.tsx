// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "./avatar";

describe("Avatar", () => {
  it("defaults to the md size", () => {
    const { container } = render(<Avatar name="Ada" />);
    const el = container.firstElementChild!;
    expect(el.className).toContain("h-8");
    expect(el.className).not.toContain("h-6");
    expect(el.className).not.toContain("h-12");
  });

  it("applies the lg size without the md classes lingering", () => {
    const { container } = render(<Avatar name="Ada" size="lg" />);
    const el = container.firstElementChild!;
    expect(el.className).toContain("h-12");
    expect(el.className).not.toContain("h-8");
  });

  it("applies the sm size without the md classes lingering", () => {
    const { container } = render(<Avatar name="Ada" size="sm" />);
    const el = container.firstElementChild!;
    expect(el.className).toContain("h-6");
    expect(el.className).not.toContain("h-8");
  });

  it("shows the uppercased first letter of the name", () => {
    const { getByText } = render(<Avatar name="ada" />);
    expect(getByText("A")).toBeInTheDocument();
  });

  it("falls back to ? when there is no name", () => {
    const { getByText } = render(<Avatar name={null} />);
    expect(getByText("?")).toBeInTheDocument();
  });
});
