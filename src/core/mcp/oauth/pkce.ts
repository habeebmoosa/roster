import { createHash, randomBytes } from "node:crypto";

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** RFC 7636 §4.2 S256 transform: BASE64URL(SHA256(ASCII(code_verifier))). */
export function computeS256CodeChallenge(codeVerifier: string): string {
  return base64UrlEncode(createHash("sha256").update(codeVerifier, "ascii").digest());
}

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
}

/**
 * Generates a fresh RFC 7636 PKCE pair. S256 only — MCP's OAuth 2.1 profile requires
 * it and forbids the `plain` method that vanilla OAuth 2.0 still allows.
 */
export function generatePkcePair(): PkcePair {
  const codeVerifier = base64UrlEncode(randomBytes(32));
  return {
    codeVerifier,
    codeChallenge: computeS256CodeChallenge(codeVerifier),
    codeChallengeMethod: "S256",
  };
}

/** A random, unguessable `state` value for CSRF protection on the authorization redirect. */
export function generateState(): string {
  return base64UrlEncode(randomBytes(16));
}
