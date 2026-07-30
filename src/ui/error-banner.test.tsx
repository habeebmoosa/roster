// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorBanner } from "./error-banner";

describe("ErrorBanner", () => {
  it("renders its content with an alert role", () => {
    render(<ErrorBanner>Something went wrong.</ErrorBanner>);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong.");
  });

  it("defaults to the sm text size", () => {
    render(<ErrorBanner>Oops</ErrorBanner>);
    expect(screen.getByRole("alert")).toHaveClass("text-sm");
  });

  it("supports the xs size variant", () => {
    render(<ErrorBanner size="xs">Oops</ErrorBanner>);
    expect(screen.getByRole("alert")).toHaveClass("text-xs");
  });

  it("merges an additional className", () => {
    render(<ErrorBanner className="mt-2">Oops</ErrorBanner>);
    expect(screen.getByRole("alert")).toHaveClass("mt-2");
  });
});
