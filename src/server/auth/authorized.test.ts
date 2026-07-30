import { describe, expect, it } from "vitest";
import { canAccess, isPathProtected } from "./authorized";

describe("isPathProtected", () => {
  it("protects /dashboard and its subpaths", () => {
    expect(isPathProtected("/dashboard")).toBe(true);
    expect(isPathProtected("/dashboard/anything")).toBe(true);
  });

  it("protects /settings and its subpaths", () => {
    expect(isPathProtected("/settings")).toBe(true);
    expect(isPathProtected("/settings/providers")).toBe(true);
  });

  it("leaves public paths open", () => {
    expect(isPathProtected("/")).toBe(false);
    expect(isPathProtected("/signin")).toBe(false);
  });

  it("respects path boundaries (no accidental prefix match)", () => {
    expect(isPathProtected("/dashboardxyz")).toBe(false);
    expect(isPathProtected("/settings-export")).toBe(false);
  });
});

describe("canAccess", () => {
  it("blocks protected paths when logged out", () => {
    expect(canAccess({ pathname: "/dashboard", isLoggedIn: false })).toBe(false);
    expect(canAccess({ pathname: "/settings", isLoggedIn: false })).toBe(false);
  });

  it("allows protected paths when logged in", () => {
    expect(canAccess({ pathname: "/dashboard", isLoggedIn: true })).toBe(true);
  });

  it("allows public paths regardless of auth", () => {
    expect(canAccess({ pathname: "/", isLoggedIn: false })).toBe(true);
    expect(canAccess({ pathname: "/signin", isLoggedIn: false })).toBe(true);
  });
});
