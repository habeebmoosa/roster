import { describe, expect, it } from "vitest";
import { trustTierCopy } from "./trust";

describe("trustTierCopy", () => {
  it("returns the matching tier's label, badge variant, and disclaimer", () => {
    expect(trustTierCopy("verified")).toMatchObject({ label: "Verified", variant: "success" });
    expect(trustTierCopy("community")).toMatchObject({ label: "Community", variant: "accent" });
    expect(trustTierCopy("custom")).toMatchObject({ label: "Custom", variant: "neutral" });
  });

  it("falls back to the custom tier's copy for an unrecognized trust tier", () => {
    expect(trustTierCopy("unknown-tier")).toEqual(trustTierCopy("custom"));
  });
});
