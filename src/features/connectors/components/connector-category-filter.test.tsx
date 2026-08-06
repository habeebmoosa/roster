// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConnectorCategoryFilter } from "./connector-category-filter";

describe("ConnectorCategoryFilter", () => {
  it("renders a Filter by trigger", () => {
    render(
      <ConnectorCategoryFilter categories={["Docs", "Engineering"]} selected={null} onSelect={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Filter by" })).toBeInTheDocument();
  });

  it("shows the selected category in the trigger label", () => {
    render(
      <ConnectorCategoryFilter categories={["Docs", "Engineering"]} selected="Docs" onSelect={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Filter by: Docs" })).toBeInTheDocument();
  });

  it("opens the menu to reveal All categories plus one item per category", async () => {
    const user = userEvent.setup();
    render(
      <ConnectorCategoryFilter categories={["Docs", "Engineering"]} selected={null} onSelect={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "Filter by" }));

    expect(screen.getByRole("menuitem", { name: "All categories" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Docs" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Engineering" })).toBeInTheDocument();
  });

  it("calls onSelect with the clicked category and closes the menu", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ConnectorCategoryFilter categories={["Docs"]} selected={null} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "Filter by" }));
    await user.click(screen.getByRole("menuitem", { name: "Docs" }));

    expect(onSelect).toHaveBeenCalledWith("Docs");
    expect(screen.queryByRole("menuitem", { name: "Docs" })).not.toBeInTheDocument();
  });

  it("calls onSelect with null when All categories is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ConnectorCategoryFilter categories={["Docs"]} selected="Docs" onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "Filter by: Docs" }));
    await user.click(screen.getByRole("menuitem", { name: "All categories" }));

    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
