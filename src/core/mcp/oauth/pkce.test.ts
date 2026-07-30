import { describe, expect, it } from "vitest";
import { computeS256CodeChallenge, generatePkcePair, generateState } from "./pkce";

describe("computeS256CodeChallenge", () => {
  it("matches the RFC 7636 Appendix B test vector", () => {
    const codeVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    expect(computeS256CodeChallenge(codeVerifier)).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });
});

describe("generatePkcePair", () => {
  it("produces a verifier within RFC 7636's 43-128 char range, base64url-only", () => {
    const { codeVerifier } = generatePkcePair();
    expect(codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(codeVerifier.length).toBeLessThanOrEqual(128);
    expect(codeVerifier).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it("derives the challenge from the verifier via S256", () => {
    const pair = generatePkcePair();
    expect(pair.codeChallenge).toBe(computeS256CodeChallenge(pair.codeVerifier));
    expect(pair.codeChallengeMethod).toBe("S256");
  });

  it("generates a fresh, unpredictable verifier on every call", () => {
    const a = generatePkcePair();
    const b = generatePkcePair();
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
  });
});

describe("generateState", () => {
  it("generates a non-empty, url-safe, unpredictable value", () => {
    const a = generateState();
    const b = generateState();
    expect(a).toMatch(/^[A-Za-z0-9\-_]+$/);
    expect(a.length).toBeGreaterThan(0);
    expect(a).not.toBe(b);
  });
});
