import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Ada — Customer Support")).toBe("ada-customer-support");
  });

  it("strips accents", () => {
    expect(slugify("Renée Dupont")).toBe("renee-dupont");
  });

  it("collapses runs of punctuation into a single hyphen", () => {
    expect(slugify("Sales & Ops!!")).toBe("sales-ops");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  -Finance-  ")).toBe("finance");
  });

  it("produces a kebab-case id matching the agent definition regex", () => {
    expect(slugify("Content Writer 2.0")).toMatch(/^[a-z0-9-]+$/);
  });
});
