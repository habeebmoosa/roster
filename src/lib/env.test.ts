import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const VALID = {
  DATABASE_URL: "postgresql://roster:roster@localhost:5432/roster?schema=public",
  DIRECT_URL: "postgresql://roster:roster@localhost:5432/roster?schema=public",
  NODE_ENV: "test",
  AUTH_SECRET: "test-secret",
  GOOGLE_CLIENT_ID: "test-client-id",
  GOOGLE_CLIENT_SECRET: "test-client-secret",
  ENCRYPTION_KEY: "Gzco8e3Z8RUeMNsiTuqVEwwhQnT4jmR1BS6mzxt953g=", // 32 bytes, base64
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

  it("requires AUTH_SECRET", () => {
    const { AUTH_SECRET: _omitted, ...rest } = VALID;
    void _omitted;
    expect(() => parseEnv(rest)).toThrow(/AUTH_SECRET/);
  });

  it("requires Google OAuth credentials", () => {
    const { GOOGLE_CLIENT_ID: _id, GOOGLE_CLIENT_SECRET: _secret, ...rest } = VALID;
    void _id;
    void _secret;
    expect(() => parseEnv(rest)).toThrow(/GOOGLE_CLIENT/);
  });

  it("rejects an ENCRYPTION_KEY that is not 32 bytes", () => {
    expect(() => parseEnv({ ...VALID, ENCRYPTION_KEY: "too-short" })).toThrow(/ENCRYPTION_KEY/);
  });
});
