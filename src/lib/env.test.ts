import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const VALID = {
  DATABASE_URL: "postgresql://roster:roster@localhost:5432/roster?schema=public",
  DIRECT_URL: "postgresql://roster:roster@localhost:5432/roster?schema=public",
  NODE_ENV: "test",
  APP_URL: "http://localhost:3005",
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

  it("requires APP_URL", () => {
    const { APP_URL: _omitted, ...rest } = VALID;
    void _omitted;
    expect(() => parseEnv(rest)).toThrow(/APP_URL/);
  });

  it("rejects an invalid APP_URL", () => {
    expect(() => parseEnv({ ...VALID, APP_URL: "not-a-url" })).toThrow(/APP_URL/);
  });

  it("requires AUTH_SECRET", () => {
    const { AUTH_SECRET: _omitted, ...rest } = VALID;
    void _omitted;
    expect(() => parseEnv(rest)).toThrow(/AUTH_SECRET/);
  });

  it("requires at least one sign-in provider", () => {
    const { GOOGLE_CLIENT_ID: _id, GOOGLE_CLIENT_SECRET: _secret, ...rest } = VALID;
    void _id;
    void _secret;
    expect(() => parseEnv(rest)).toThrow(/at least one sign-in provider/);
  });

  it("accepts GitHub OAuth as the only sign-in provider", () => {
    const { GOOGLE_CLIENT_ID: _id, GOOGLE_CLIENT_SECRET: _secret, ...rest } = VALID;
    void _id;
    void _secret;
    expect(() =>
      parseEnv({ ...rest, GITHUB_CLIENT_ID: "gh-id", GITHUB_CLIENT_SECRET: "gh-secret" }),
    ).not.toThrow();
  });

  it("rejects an ENCRYPTION_KEY that is not 32 bytes", () => {
    expect(() => parseEnv({ ...VALID, ENCRYPTION_KEY: "too-short" })).toThrow(/ENCRYPTION_KEY/);
  });

  it("treats the Upstash env vars as optional", () => {
    expect(() => parseEnv(VALID)).not.toThrow();
  });

  it("accepts a configured Upstash URL and token", () => {
    const env = parseEnv({
      ...VALID,
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "test-token",
    });
    expect(env.UPSTASH_REDIS_REST_URL).toBe("https://example.upstash.io");
  });

  it("rejects an invalid UPSTASH_REDIS_REST_URL", () => {
    expect(() => parseEnv({ ...VALID, UPSTASH_REDIS_REST_URL: "not-a-url" })).toThrow(
      /UPSTASH_REDIS_REST_URL/,
    );
  });
});
