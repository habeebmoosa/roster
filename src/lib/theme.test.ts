import { describe, expect, it } from "vitest";
import { parseTheme } from "./theme";

describe("parseTheme", () => {
  it("resolves 'dark' to dark", () => {
    expect(parseTheme("dark")).toBe("dark");
  });

  it("resolves 'light' to light", () => {
    expect(parseTheme("light")).toBe("light");
  });

  it("defaults anything else to light", () => {
    expect(parseTheme("purple")).toBe("light");
    expect(parseTheme(undefined)).toBe("light");
    expect(parseTheme(null)).toBe("light");
    expect(parseTheme("")).toBe("light");
  });
});
