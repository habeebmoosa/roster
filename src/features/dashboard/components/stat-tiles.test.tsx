// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatTiles } from "./stat-tiles";

describe("StatTiles", () => {
  it("renders the real and fixture values", () => {
    render(
      <StatTiles
        activeEmployees={3}
        totalEmployees={5}
        conversations30d={128}
        spendThisMonthUsd={86.4}
        evalSuccessRatePct={94}
      />,
    );

    expect(screen.getByText("3 / 5")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
    expect(screen.getByText("$86.40")).toBeInTheDocument();
    expect(screen.getByText("94%")).toBeInTheDocument();
  });

  it("shows a placeholder when there is no eval data yet", () => {
    render(
      <StatTiles
        activeEmployees={0}
        totalEmployees={0}
        conversations30d={0}
        spendThisMonthUsd={0}
        evalSuccessRatePct={null}
      />,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("No eval runs yet")).toBeInTheDocument();
  });
});
