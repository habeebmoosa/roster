// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkersPagination } from "./workers-pagination";

describe("WorkersPagination", () => {
  it("shows the current page and total", () => {
    render(<WorkersPagination page={2} totalPages={3} total={25} query="" />);
    expect(screen.getByText("Viewing page 2 of 3 · 25 total")).toBeInTheDocument();
  });

  it("marks Previous disabled on the first page", () => {
    render(<WorkersPagination page={1} totalPages={3} total={25} query="" />);
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("aria-disabled", "false");
  });

  it("marks Next disabled on the last page", () => {
    render(<WorkersPagination page={3} totalPages={3} total={25} query="" />);
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("aria-disabled", "true");
  });

  it("preserves the search query in pagination links", () => {
    render(<WorkersPagination page={1} totalPages={2} total={15} query="support" />);
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/workers?q=support&page=2",
    );
  });

  it("shows a plain message when there are no results", () => {
    render(<WorkersPagination page={1} totalPages={1} total={0} query="zzz" />);
    expect(screen.getByText("No workers")).toBeInTheDocument();
  });
});
