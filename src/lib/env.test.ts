import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const VALID = {
  DATABASE_URL: "postgresql://roster:roster@localhost:5432/roster?schema=public",
  DIRECT_URL: "postgresql://roster:roster@localhost:5432/roster?schema=public",
  NODE_ENV: "test",
} satisfies Record<string, string | undefined>;

describe("parseEnv", () => {
  it("accepts a valid configuration", () => {
    const env = parseEnv(VALID);
    expect(env.DATABASE_URL).toContain("postgresql://");
    expect(env.NODE_ENV).toBe("test");
  });

  it("defaults NODE_ENV to development", () => {
    const { NODE_ENV: _omitted, ...rest } = VALID;
    void _omitted;
    expect(parseEnv(rest).NODE_ENV).toBe("development");
  });

  it("treats DIRECT_URL as optional", () => {
    const { DIRECT_URL: _omitted, ...rest } = VALID;
    void _omitted;
    expect(() => parseEnv(rest)).not.toThrow();
  });

  it("rejects a missing DATABASE_URL", () => {
    const { DATABASE_URL: _omitted, ...rest } = VALID;
    void _omitted;
    expect(() => parseEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it("rejects an invalid DATABASE_URL", () => {
    expect(() => parseEnv({ ...VALID, DATABASE_URL: "not-a-url" })).toThrow(/DATABASE_URL/);
  });

  it("rejects an invalid NODE_ENV", () => {
    expect(() => parseEnv({ ...VALID, NODE_ENV: "staging" })).toThrow();
  });
});
