// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DetailStats } from "./detail-stats";

describe("DetailStats", () => {
  it("renders formatted values for all four stats", () => {
    render(
      <DetailStats conversations30d={42} spend30dUsd={36} tokens30dLabel="1.2M" uptimePct={99.9} />,
    );
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("$36")).toBeInTheDocument();
    expect(screen.getByText("1.2M")).toBeInTheDocument();
    expect(screen.getByText("99.9%")).toBeInTheDocument();
  });
});
