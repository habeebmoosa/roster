// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DetailApiTab } from "./detail-api-tab";

describe("DetailApiTab", () => {
  it("defaults to the API Key auth mode and cURL language", () => {
    render(<DetailApiTab agentId="customer-support" />);
    expect(screen.getByRole("button", { name: "API Key" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Authorization: Bearer YOUR_API_KEY/)).toBeInTheDocument();
    expect(screen.getByText("Requires a bearer token per request.")).toBeInTheDocument();
  });

  it("shows the real agent id in the endpoint (both the display line and the snippet)", () => {
    render(<DetailApiTab agentId="customer-support" />);
    expect(
      screen.getAllByText(/api\.rosterai\.com\/v1\/agents\/customer-support\/chat/).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("switches to No auth and drops the Authorization header from the snippet", async () => {
    const user = userEvent.setup();
    render(<DetailApiTab agentId="customer-support" />);

    await user.click(screen.getByRole("button", { name: "No auth" }));

    expect(screen.getByRole("button", { name: "No auth" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Internal networks only — not recommended.")).toBeInTheDocument();
    expect(screen.queryByText(/Authorization/)).not.toBeInTheDocument();
  });

  it("switches the code snippet's language", async () => {
    const user = userEvent.setup();
    render(<DetailApiTab agentId="customer-support" />);

    expect(screen.getByText(/^curl -X POST/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Python" }));
    expect(screen.getByText(/^import requests/)).toBeInTheDocument();
  });
});
