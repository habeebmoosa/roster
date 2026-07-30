// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DetailModelTab } from "./detail-model-tab";

describe("DetailModelTab", () => {
  it("renders provider, tier, and model", () => {
    render(<DetailModelTab provider="Google" tier="Free tier" model="gemini-2.0-flash" />);
    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.getByText("Free tier")).toBeInTheDocument();
    expect(screen.getByText("gemini-2.0-flash")).toBeInTheDocument();
  });

  it("links Change model to the real provider settings page", () => {
    render(<DetailModelTab provider="Google" tier="Free tier" model="gemini-2.0-flash" />);
    expect(screen.getByRole("link", { name: /Change model/ })).toHaveAttribute(
      "href",
      "/settings?tab=providers",
    );
  });
});
