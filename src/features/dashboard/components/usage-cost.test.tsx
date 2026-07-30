// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UsageCost } from "./usage-cost";

describe("UsageCost", () => {
  it("renders each entry's name and spend", () => {
    render(
      <UsageCost
        entries={[
          { id: "ada", name: "Ada", spendUsd: 30 },
          { id: "milo", name: "Milo", spendUsd: 10 },
        ]}
      />,
    );
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("$30")).toBeInTheDocument();
    expect(screen.getByText("Milo")).toBeInTheDocument();
    expect(screen.getByText("$10")).toBeInTheDocument();
  });

  it("shows an empty state with no entries", () => {
    render(<UsageCost entries={[]} />);
    expect(screen.getByText("Nothing to show yet")).toBeInTheDocument();
  });
});
